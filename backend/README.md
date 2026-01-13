# Django Backend Setup

## 🚀 Quick Start

### 1. Create MySQL Database

Run the following SQL command or use the provided script:

```sql
CREATE DATABASE pr_mgmt_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**OR** use MySQL command line:
```bash
mysql -u root -p < create_database.sql
```

### 2. Activate Virtual Environment

```bash
cd backend
.\\venv\\Scripts\\activate  # Windows
# OR
source venv/bin/activate     # Linux/Mac
```

### 3. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Create Admin User

```bash
python manage.py createsuperuser
```

### 5. Run Development Server

```bash
python manage.py runserver 8000
```

---

## 📍 API Endpoints

Base URL: `http://localhost:8000/api/forms/`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/submit/` | POST | Submit a form |
| `/submissions/` | GET | List all submissions |
| `/submissions/?form_type=daily-status` | GET | Filter by form type |
| `/definitions/{slug}/` | GET | Get form definition |
| `/health/` | GET | Health check |

### Submit Form Example

```bash
curl -X POST http://localhost:8000/api/forms/submit/ \
  -H "Content-Type: application/json" \
  -d '{
    "form_type": "daily-status",
    "form_title": "Daily Status Update",
    "submission_data": {
      "Tasks Completed": "Setup Django backend",
      "Progress Status": "On Track"
    }
  }'
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and update:

```env
DB_PASSWORD=your_mysql_password
```

---

## 🛠️ Django Admin

Access at: `http://localhost:8000/admin/`

View and manage:
- Form Submissions
- Form Definitions

---

## 📦 Project Structure

```
backend/
├── manage.py
├── backend/          # Project config
│   ├── settings.py   # MySQL, DRF, CORS configured
│   └── urls.py       # Main URL routing
├── forms/            # Forms app
│   ├── models.py     # FormSubmission, FormDefinition
│   ├── serializers.py
│   ├── views.py      # API views
│   ├── urls.py       # API routing
│   └── admin.py      # Admin interface
└── requirements.txt
```
