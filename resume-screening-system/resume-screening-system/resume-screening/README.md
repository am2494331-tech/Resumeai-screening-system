# Resume Screening System

An AI-powered resume screening web application built with Python (Flask) and SQLite.

## Features

- **NLP Keyword Matching** — extracts keywords from job descriptions and scores resumes
- **SQLite Database** — stores candidates, screenings, results, and audit logs
- **Ranked Results** — candidates sorted by relevance score with matched/missing keywords
- **Preset Roles** — 4 built-in job presets with sample resumes for quick demo
- **Screening History** — all past sessions saved and viewable
- **Activity Log** — full audit trail of every action

## Project Structure

```
resume-screening/
├── app.py               # Flask backend + NLP logic
├── requirements.txt     # Python dependencies
├── README.md
├── database/            # SQLite DB stored here (auto-created)
├── templates/
│   └── index.html       # Main HTML template
└── static/
    ├── css/
    │   └── style.css    # Styles
    └── js/
        └── app.js       # Frontend JavaScript
```

## Setup & Run

### 1. Install Python 3.8+

Make sure Python is installed:
```bash
python --version
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the app

```bash
python app.py
```

### 4. Open in browser

Visit: **http://127.0.0.1:5000**

---

## How to Use

1. **Load a preset** — Select a job role from the dropdown to auto-fill the job description and add sample candidates
2. **Or add manually** — Enter a job description and paste resume text for each candidate
3. **Click "Run Screening"** — The NLP engine scores and ranks all candidates
4. **View Results** — See ranked candidates with matched and missing keywords
5. **Database tab** — Browse all stored candidates with their latest scores
6. **History tab** — Review all past screening sessions
7. **Activity Log** — Full audit trail

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/candidates` | List all candidates |
| POST | `/api/candidates` | Add a candidate |
| DELETE | `/api/candidates/<id>` | Remove a candidate |
| POST | `/api/screen` | Run a screening session |
| GET | `/api/stats` | Database statistics |
| GET | `/api/screenings` | All screening sessions |
| GET | `/api/screenings/<id>` | Screening detail |
| GET | `/api/log` | Activity log |

## Tech Stack

- **Backend**: Python, Flask, SQLite
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **NLP**: Custom keyword extraction with stopword filtering and frequency ranking
