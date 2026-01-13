import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','backend.settings')
import django
django.setup()

from hr.models import Department, Designation
from tags.models import Tags

# ============ DEPARTMENTS ============
departments = [
    ('Engineering', 'ENG', 'development', 'Software development, architecture, and technical operations'),
    ('Product', 'PROD', 'management', 'Product management, roadmapping, and feature planning'),
    ('Design', 'DES', 'development', 'UI/UX design, branding, and creative services'),
    ('Quality Assurance', 'QA', 'qa', 'Testing, automation, and quality control'),
    ('DevOps', 'OPS', 'development', 'Infrastructure, CI/CD, and cloud operations'),
    ('Data & Analytics', 'DATA', 'development', 'Business intelligence, data engineering, and analytics'),
    ('Human Resources', 'HR', 'hr', 'Recruitment, employee relations, and HR operations'),
    ('Finance', 'FIN', 'finance', 'Accounting, budgeting, and financial planning'),
    ('Sales', 'SALES', 'other', 'Sales operations, client acquisition, and account management'),
    ('Marketing', 'MKT', 'other', 'Digital marketing, content, and brand management'),
    ('Customer Success', 'CS', 'support', 'Customer support, onboarding, and retention'),
    ('Administration', 'ADMIN', 'other', 'Office management and administrative operations'),
    ('Legal & Compliance', 'LEGAL', 'other', 'Contracts, compliance, and regulatory affairs'),
    ('IT Support', 'IT', 'support', 'Internal IT infrastructure and helpdesk'),
    ('Implementation', 'IMPL', 'implementation', 'Client implementations and deployments'),
]

for name, code, category, desc in departments:
    dept, created = Department.objects.get_or_create(
        dept_code=code,
        defaults={'dept_name': name, 'category': category, 'description': desc}
    )
    status = "Created" if created else "Exists"
    print(f'Dept: {name} - {status}')

print()

# Level mapping: 1=Entry, 5=Manager, 10=Executive
LEVELS = {'Leadership': 10, 'Director': 9, 'Manager': 7, 'Lead': 6, 'Senior': 5, 'Mid': 4, 'Junior': 2, 'Entry': 1, 'Support': 3}

# ============ DESIGNATIONS ============
designations = [
    # C-Level
    ('Chief Executive Officer', 'CEO', 'Leadership'),
    ('Chief Technology Officer', 'CTO', 'Leadership'),
    ('Chief Product Officer', 'CPO', 'Leadership'),
    ('Chief Financial Officer', 'CFO', 'Leadership'),
    ('Chief Operating Officer', 'COO', 'Leadership'),
    ('Chief Marketing Officer', 'CMO', 'Leadership'),
    
    # Directors
    ('Director of Engineering', 'DOE', 'Director'),
    ('Director of Product', 'DOP', 'Director'),
    ('Director of Design', 'DOD', 'Director'),
    ('Director of Operations', 'DOO', 'Director'),
    ('Director of HR', 'DOH', 'Director'),
    ('Director of Sales', 'DOS', 'Director'),
    
    # Managers
    ('Engineering Manager', 'EM', 'Manager'),
    ('Product Manager', 'PM', 'Manager'),
    ('Project Manager', 'PJM', 'Manager'),
    ('Design Manager', 'DM', 'Manager'),
    ('QA Manager', 'QAM', 'Manager'),
    ('DevOps Manager', 'DOM', 'Manager'),
    ('HR Manager', 'HRM', 'Manager'),
    ('Account Manager', 'AM', 'Manager'),
    ('Marketing Manager', 'MM', 'Manager'),
    
    # Team Leads
    ('Tech Lead', 'TL', 'Lead'),
    ('Team Lead', 'LEAD', 'Lead'),
    ('QA Lead', 'QAL', 'Lead'),
    ('Design Lead', 'DL', 'Lead'),
    
    # Senior Engineers
    ('Principal Engineer', 'PE', 'Senior'),
    ('Staff Engineer', 'SE', 'Senior'),
    ('Senior Software Engineer', 'SSE', 'Senior'),
    ('Senior Frontend Engineer', 'SFE', 'Senior'),
    ('Senior Backend Engineer', 'SBE', 'Senior'),
    ('Senior Full Stack Engineer', 'SFSE', 'Senior'),
    ('Senior DevOps Engineer', 'SDOE', 'Senior'),
    ('Senior QA Engineer', 'SQAE', 'Senior'),
    ('Senior Data Engineer', 'SDE', 'Senior'),
    ('Senior UI/UX Designer', 'SUXD', 'Senior'),
    
    # Mid-Level
    ('Software Engineer', 'SWE', 'Mid'),
    ('Frontend Engineer', 'FE', 'Mid'),
    ('Backend Engineer', 'BE', 'Mid'),
    ('Full Stack Engineer', 'FSE', 'Mid'),
    ('DevOps Engineer', 'DOEM', 'Mid'),
    ('QA Engineer', 'QAE', 'Mid'),
    ('Data Engineer', 'DAE', 'Mid'),
    ('Data Analyst', 'DA', 'Mid'),
    ('UI/UX Designer', 'UXD', 'Mid'),
    ('Visual Designer', 'VD', 'Mid'),
    ('Product Analyst', 'PA', 'Mid'),
    ('Business Analyst', 'BA', 'Mid'),
    
    # Junior
    ('Junior Software Engineer', 'JSE', 'Junior'),
    ('Junior Frontend Engineer', 'JFE', 'Junior'),
    ('Junior Backend Engineer', 'JBE', 'Junior'),
    ('Junior QA Engineer', 'JQAE', 'Junior'),
    ('Junior Designer', 'JD', 'Junior'),
    
    # Associate/Entry
    ('Associate Engineer', 'AE', 'Entry'),
    ('Trainee', 'TR', 'Entry'),
    ('Intern', 'INT', 'Entry'),
    
    # Support/Admin
    ('HR Executive', 'HRE', 'Support'),
    ('HR Coordinator', 'HRC', 'Support'),
    ('Recruiter', 'REC', 'Support'),
    ('Office Administrator', 'OA', 'Support'),
    ('Executive Assistant', 'EA', 'Support'),
    ('Accountant', 'ACC', 'Support'),
    ('IT Support Specialist', 'ITS', 'Support'),
]

for name, code, level_name in designations:
    level = LEVELS.get(level_name, 3)
    des, created = Designation.objects.get_or_create(
        designation_code=code,
        defaults={'designation_name': name, 'level': level}
    )
    status = "Created" if created else "Exists"
    print(f'Designation: {name} - {status}')


print()

# ============ TAG CATEGORIES ============
from tags.models import Tags, TagCategory

tag_categories = [
    ('project', 'Project Type', '📦', '#3B82F6', 'Types of projects'),
    ('priority', 'Priority', '🔥', '#DC2626', 'Priority levels'),
    ('task', 'Task Type', '📋', '#22C55E', 'Categories of tasks'),
    ('tech', 'Technology', '💻', '#8B5CF6', 'Tech stack tags'),
    ('status', 'Status', '🔄', '#F59E0B', 'Workflow status tags'),
    ('client', 'Client/Industry', '🏢', '#0891B2', 'Client type or industry'),
    ('sprint', 'Sprint/Timeline', '🗓️', '#6366F1', 'Sprint planning tags'),
]

category_map = {}
for name, label, icon, color, desc in tag_categories:
    cat, created = TagCategory.objects.get_or_create(
        name=name,
        defaults={'label': label, 'icon': icon, 'color': color, 'description': desc}
    )
    category_map[name] = cat
    status = "Created" if created else "Exists"
    print(f'Category: {label} - {status}')

print()

# ============ TAGS ============
tags = [
    # Project Types
    ('Web Application', 'project', '#3B82F6', 'Project built for web browsers'),
    ('Mobile App', 'project', '#10B981', 'iOS or Android mobile application'),
    ('API Development', 'project', '#8B5CF6', 'Backend API or microservices'),
    ('Desktop App', 'project', '#F59E0B', 'Desktop application (Windows/Mac/Linux)'),
    ('Data Pipeline', 'project', '#EC4899', 'ETL and data processing pipelines'),
    ('Machine Learning', 'project', '#06B6D4', 'AI/ML model development'),
    ('Infrastructure', 'project', '#6366F1', 'DevOps and cloud infrastructure'),
    ('Integration', 'project', '#14B8A6', 'Third-party system integrations'),
    
    # Priority/Urgency
    ('Critical', 'priority', '#DC2626', 'Requires immediate attention'),
    ('High Priority', 'priority', '#F97316', 'High business impact'),
    ('Medium Priority', 'priority', '#EAB308', 'Normal priority level'),
    ('Low Priority', 'priority', '#22C55E', 'Can be scheduled later'),
    
    # Task Categories
    ('Bug Fix', 'task', '#EF4444', 'Fixing a software defect'),
    ('Feature', 'task', '#22C55E', 'New feature development'),
    ('Enhancement', 'task', '#3B82F6', 'Improving existing functionality'),
    ('Refactor', 'task', '#8B5CF6', 'Code restructuring without changing behavior'),
    ('Documentation', 'task', '#6B7280', 'Writing or updating docs'),
    ('Testing', 'task', '#F59E0B', 'Test case creation or execution'),
    ('Research', 'task', '#EC4899', 'Investigation or spike'),
    ('DevOps', 'task', '#06B6D4', 'CI/CD and infrastructure tasks'),
    ('Security', 'task', '#DC2626', 'Security-related work'),
    ('Performance', 'task', '#14B8A6', 'Performance optimization'),
    ('UI/UX', 'task', '#A855F7', 'Design and user experience work'),
    ('Database', 'task', '#0EA5E9', 'Database schema or query changes'),
    
    # Tech Stack
    ('React', 'tech', '#61DAFB', 'React.js frontend'),
    ('Vue', 'tech', '#4FC08D', 'Vue.js frontend'),
    ('Angular', 'tech', '#DD0031', 'Angular frontend'),
    ('Node.js', 'tech', '#339933', 'Node.js backend'),
    ('Python', 'tech', '#3776AB', 'Python backend'),
    ('Django', 'tech', '#092E20', 'Django framework'),
    ('FastAPI', 'tech', '#009688', 'FastAPI framework'),
    ('TypeScript', 'tech', '#3178C6', 'TypeScript codebase'),
    ('PostgreSQL', 'tech', '#336791', 'PostgreSQL database'),
    ('MongoDB', 'tech', '#47A248', 'MongoDB database'),
    ('Redis', 'tech', '#DC382D', 'Redis cache/queue'),
    ('Docker', 'tech', '#2496ED', 'Docker containerization'),
    ('Kubernetes', 'tech', '#326CE5', 'Kubernetes orchestration'),
    ('AWS', 'tech', '#FF9900', 'Amazon Web Services'),
    ('GCP', 'tech', '#4285F4', 'Google Cloud Platform'),
    ('Azure', 'tech', '#0078D4', 'Microsoft Azure'),
    
    # Status/Stage
    ('Blocked', 'status', '#DC2626', 'Waiting on external dependency'),
    ('Needs Review', 'status', '#F59E0B', 'Awaiting code review'),
    ('In Testing', 'status', '#8B5CF6', 'Being tested by QA'),
    ('Ready for Deploy', 'status', '#22C55E', 'Ready for production'),
    ('On Hold', 'status', '#6B7280', 'Temporarily paused'),
    
    # Client/Industry
    ('Enterprise', 'client', '#1E3A8A', 'Enterprise-level client'),
    ('Startup', 'client', '#7C3AED', 'Startup client'),
    ('Internal', 'client', '#059669', 'Internal project'),
    ('Government', 'client', '#0F172A', 'Government/Public sector'),
    ('Healthcare', 'client', '#DC2626', 'Healthcare industry'),
    ('Fintech', 'client', '#0891B2', 'Financial technology'),
    ('E-commerce', 'client', '#F97316', 'E-commerce/Retail'),
    ('Education', 'client', '#8B5CF6', 'EdTech/Education'),
    
    # Sprint/Timeline
    ('Current Sprint', 'sprint', '#22C55E', 'Part of current sprint'),
    ('Next Sprint', 'sprint', '#3B82F6', 'Planned for next sprint'),
    ('Backlog', 'sprint', '#6B7280', 'In product backlog'),
    ('Tech Debt', 'sprint', '#EF4444', 'Technical debt to address'),
    ('Quick Win', 'sprint', '#10B981', 'Easy implementation, high value'),
]

for name, cat_name, color, description in tags:
    slug = name.lower().replace(' ', '-').replace('/', '-').replace('.', '')
    cat = category_map.get(cat_name)
    tag, created = Tags.objects.get_or_create(
        slug=slug,
        defaults={'name': name, 'category': cat, 'color': color, 'description': description}
    )
    status = "Created" if created else "Exists"
    print(f'Tag: {name} ({cat_name}) - {status}')

print()
print('=' * 50)
print(f'Total Departments: {Department.objects.count()}')
print(f'Total Designations: {Designation.objects.count()}')
print(f'Total Tag Categories: {TagCategory.objects.count()}')
print(f'Total Tags: {Tags.objects.count()}')
print('=' * 50)
