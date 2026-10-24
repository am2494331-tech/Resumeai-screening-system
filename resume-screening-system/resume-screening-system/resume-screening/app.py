from flask import Flask, render_template, request, jsonify
import sqlite3
import os
import re
from datetime import datetime
from collections import Counter
from pypdf import PdfReader

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'resumes.db')

# ─── Database Setup ───────────────────────────────────────────────────────────



def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 30000")
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            resume_text TEXT NOT NULL,
            added_at TEXT NOT NULL,
            last_score INTEGER DEFAULT NULL,
            last_screened TEXT DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS screenings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_title TEXT NOT NULL,
            job_description TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS screening_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            screening_id INTEGER NOT NULL,
            candidate_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            matched_keywords TEXT NOT NULL,
            missed_keywords TEXT NOT NULL,
            FOREIGN KEY (screening_id) REFERENCES screenings(id),
            FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        );

        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            details TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
    """)
    conn.commit()
    conn.close()

# ─── NLP Helpers ──────────────────────────────────────────────────────────────

STOPWORDS = {
    'a','an','the','and','or','of','to','in','for','with','on','at','is','are',
    'was','were','we','i','you','it','as','by','be','this','that','from','our',
    'their','has','have','some','no','not','more','also','can','will','experience',
    'looking','seeking','years','using','used','worked','work','basic','strong',
    'good','skills','skill','knowledge','familiar','background','built','all',
    'both','most','least','about','able','after','before','between','during',
    'including','without','within','through','while','where','when','how','what',
    'who','which','than','then','them','they','he','she','his','her','its'
}

def extract_keywords(text, top_n=30):
    words = re.findall(r'[a-zA-Z][a-zA-Z+#.\-]{1,}', text.lower())
    freq = Counter(w for w in words if w not in STOPWORDS and len(w) > 2)
    return [w for w, _ in freq.most_common(top_n)]

def match_score(resume_text, jd_text):
    jd_kw = extract_keywords(jd_text)
    res_kw = set(extract_keywords(resume_text, 50))
    resume_lower = resume_text.lower()
    matched = [k for k in jd_kw if k in res_kw or k in resume_lower]
    missed = [k for k in jd_kw if k not in matched]
    score = min(100, round((len(matched) / max(len(jd_kw), 1)) * 100))
    return score, matched[:15], missed[:8]

def log_action(action, details):
    conn = get_db()
    conn.execute(
        "INSERT INTO activity_log (action, details, created_at) VALUES (?, ?, ?)",
        (action, details, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    )
    conn.commit()
    conn.close()

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/candidates', methods=['GET'])
def get_candidates():
    conn = get_db()
    rows = conn.execute("SELECT * FROM candidates ORDER BY added_at DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/candidates', methods=['POST'])
def add_candidate():
    data = request.json
    name = data.get('name', '').strip()
    text = data.get('resume_text', '').strip()
    if not name or not text:
        return jsonify({'error': 'Name and resume text are required'}), 400
    conn = get_db()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cur = conn.execute(
        "INSERT INTO candidates (name, resume_text, added_at) VALUES (?, ?, ?)",
        (name, text, now)
    )
    conn.commit()
    cid = cur.lastrowid
    conn.close()
    log_action('CANDIDATE_ADDED', f'Added candidate: {name} (ID: {cid})')
    return jsonify({'id': cid, 'name': name, 'added_at': now}), 201

# ─── PDF Resume Upload ─────────────────────────────────────

@app.route('/api/upload-resume', methods=['POST'])
def upload_resume():
    if 'resume' not in request.files:
        return jsonify({'error': 'Please select a PDF resume'}), 400

    file = request.files['resume']
    name = request.form.get('name', '').strip()

    if not file or not file.filename:
        return jsonify({'error': 'No file selected'}), 400

    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are allowed'}), 400

    # Limit uploads to 10 MB
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size == 0:
        return jsonify({'error': 'The uploaded file is empty'}), 400

    if file_size > 10 * 1024 * 1024:
        return jsonify({'error': 'PDF must be 10 MB or smaller'}), 400

    try:
        reader = PdfReader(file)

        if reader.is_encrypted:
            return jsonify({
                'error': 'Password-protected PDFs are not supported'
            }), 400

        resume_text = '\n'.join(
            page.extract_text() or ''
            for page in reader.pages
        ).strip()

    except Exception:
        return jsonify({
            'error': 'Unable to read this PDF. Please upload a valid PDF.'
        }), 400

    if not resume_text:
        return jsonify({
            'error': 'No readable text found. Please upload a text-based PDF.'
        }), 400

    if not name:
        name = os.path.splitext(
            os.path.basename(file.filename)
        )[0].strip()

    if not name:
        return jsonify({'error': 'Candidate name is required'}), 400

    conn = get_db()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cur = conn.execute(
        """
        INSERT INTO candidates (name, resume_text, added_at)
        VALUES (?, ?, ?)
        """,
        (name, resume_text, now)
    )

    candidate_id = cur.lastrowid
    conn.commit()
    conn.close()

    log_action(
        'CANDIDATE_ADDED',
        f'Uploaded PDF resume for {name} (ID: {candidate_id})'
    )

    return jsonify({
        'message': 'Resume uploaded successfully',
        'id': candidate_id,
        'name': name,
        'added_at': now,
        'extracted_characters': len(resume_text)
    }), 201


@app.route('/api/candidates/<int:cid>', methods=['DELETE'])
def delete_candidate(cid):
    conn = get_db()
    row = conn.execute("SELECT name FROM candidates WHERE id=?", (cid,)).fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Not found'}), 404
    conn.execute("DELETE FROM candidates WHERE id=?", (cid,))
    conn.commit()
    conn.close()
    log_action('CANDIDATE_REMOVED', f'Removed candidate: {row["name"]} (ID: {cid})')
    return jsonify({'ok': True})


@app.route('/api/screen', methods=['POST'])
def run_screening():
    data = request.get_json(silent=True) or {}

    jd = data.get('job_description', '').strip()
    job_title = data.get('job_title', 'Untitled Role').strip()

    if not jd:
        return jsonify({'error': 'Job description is required'}), 400

    conn = get_db()

    try:
        candidates = conn.execute(
            "SELECT * FROM candidates"
        ).fetchall()

        if not candidates:
            return jsonify({
                'error': 'No candidates in database'
            }), 400

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor = conn.execute(
            """INSERT INTO screenings
               (job_title, job_description, created_at)
               VALUES (?, ?, ?)""",
            (job_title, jd, now)
        )

        screening_id = cursor.lastrowid
        results = []

        for c in candidates:
            score, matched, missed = match_score(
                c['resume_text'], jd
            )

            conn.execute(
                """INSERT INTO screening_results
                   (screening_id, candidate_id, score,
                    matched_keywords, missed_keywords)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    screening_id,
                    c['id'],
                    score,
                    ','.join(matched),
                    ','.join(missed)
                )
            )

            conn.execute(
                """UPDATE candidates
                   SET last_score = ?, last_screened = ?
                   WHERE id = ?""",
                (score, now, c['id'])
            )

            results.append({
                'id': c['id'],
                'name': c['name'],
                'score': score,
                'matched': matched,
                'missed': missed
            })

        # Save all screening changes together
        conn.commit()

    except Exception:
        conn.rollback()
        app.logger.exception("Screening failed")
        return jsonify({
            'error': 'Screening failed. Check the Flask terminal.'
        }), 500

    finally:
        conn.close()

    results.sort(key=lambda x: x['score'], reverse=True)

    try:
        for item in results:
            log_action(
                'SCORED',
                f"{item['name']} scored {item['score']}% for "
                f"\"{job_title}\""
            )

        log_action(
            'SCREENING_COMPLETE',
            f'Screening "{job_title}" completed'
        )
    except Exception:
        app.logger.exception("Activity log failed")

    return jsonify({
        'screening_id': screening_id,
        'results': results
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM candidates").fetchone()[0]
    screened = conn.execute("SELECT COUNT(*) FROM candidates WHERE last_score IS NOT NULL").fetchone()[0]
    avg_row = conn.execute("SELECT AVG(last_score) FROM candidates WHERE last_score IS NOT NULL").fetchone()[0]
    avg = round(avg_row) if avg_row else None
    screenings = conn.execute("SELECT COUNT(*) FROM screenings").fetchone()[0]
    conn.close()
    return jsonify({'total': total, 'screened': screened, 'avg_score': avg, 'screenings': screenings})

@app.route('/api/log', methods=['GET'])
def get_log():
    conn = get_db()
    rows = conn.execute("SELECT * FROM activity_log ORDER BY id DESC LIMIT 100").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/screenings', methods=['GET'])
def get_screenings():
    conn = get_db()
    rows = conn.execute("""
        SELECT s.id, s.job_title, s.created_at,
               COUNT(sr.id) as candidate_count,
               MAX(sr.score) as top_score
        FROM screenings s
        LEFT JOIN screening_results sr ON s.id = sr.screening_id
        GROUP BY s.id ORDER BY s.id DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/screenings/<int:sid>', methods=['GET'])
def get_screening_detail(sid):
    conn = get_db()
    screening = conn.execute("SELECT * FROM screenings WHERE id=?", (sid,)).fetchone()
    if not screening:
        conn.close()
        return jsonify({'error': 'Not found'}), 404
    results = conn.execute("""
        SELECT c.name, sr.score, sr.matched_keywords, sr.missed_keywords
        FROM screening_results sr JOIN candidates c ON sr.candidate_id = c.id
        WHERE sr.screening_id=? ORDER BY sr.score DESC
    """, (sid,)).fetchall()
    conn.close()
    return jsonify({
        'screening': dict(screening),
        'results': [dict(r) for r in results]
    })

if __name__ == '__main__':
    init_db()
    print("Resume Screening System running at http://127.0.0.1:5000")
    app.run(debug=True)
