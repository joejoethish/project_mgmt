// API Configuration
// Change this when deploying to production or using a different port

export const API_BASE_URL = 'http://192.168.1.26:8000';

// Helper to construct API URLs
export const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

// Common API endpoints
export const API_ENDPOINTS = {
    // HR Module
    hr: {
        employees: `${API_BASE_URL}/api/hr/employees/`,
        departments: `${API_BASE_URL}/api/hr/departments/`,
        designations: `${API_BASE_URL}/api/hr/designations/`,
        leaveTypes: `${API_BASE_URL}/api/hr/leave-types/`,
        skills: `${API_BASE_URL}/api/hr/skills/`,
        leaveRequests: `${API_BASE_URL}/api/hr/leave-requests/`,
    },
    // PM Module
    pm: {
        projects: `${API_BASE_URL}/api/pm/projects/`,
        tasks: `${API_BASE_URL}/api/pm/tasks/`,
        taskStatuses: `${API_BASE_URL}/api/pm/taskstatuses/`,
        taskPriorities: `${API_BASE_URL}/api/pm/taskpriorities/`,
        taskComments: `${API_BASE_URL}/api/pm/taskcomments/`,
        members: `${API_BASE_URL}/api/pm/members/`,
        teams: `${API_BASE_URL}/api/pm/teams/`,
        sprints: `${API_BASE_URL}/api/pm/sprints/`,
        roles: `${API_BASE_URL}/api/pm/roles/`,
    },
    // Forms Module
    forms: {
        definitions: `${API_BASE_URL}/api/forms/definitions/`,
        submissions: `${API_BASE_URL}/api/forms/submissions/`,
    },
    // Masters Module
    masters: {
        schemas: `${API_BASE_URL}/api/masters/schemas/`,
        dynamicMasters: `${API_BASE_URL}/api/masters/dynamic-masters/`,
    }
};

