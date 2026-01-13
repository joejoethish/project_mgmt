import FormRenderer from '../components/FormRenderer';
import { FormDefinition } from '../types/schema';

export default function WeeklyReportPage() {
    const formDef: FormDefinition = {
        title: "Weekly Report",
        description: "Comprehensive weekly summary of accomplishments, challenges, and priorities",
        sections: [
            {
                title: "Week Overview",
                description: "Basic information about this reporting period",
                columns: 2,
                questions: [
                    {
                        title: "Your Name",
                        type: "text",
                        required: true
                    },
                    {
                        title: "Department/Team",
                        type: "text",
                        required: true
                    },
                    {
                        title: "Week Of",
                        type: "text",
                        required: true
                    },
                    {
                        title: "Overall Status",
                        type: "choice",
                        options: ["Excellent Progress", "On Track", "Some Challenges", "Needs Attention", "Critical Issues"],
                        required: true
                    }
                ]
            },
            {
                title: "Major Accomplishments",
                description: "What did you complete this week? Focus on impact and results",
                questions: [
                    {
                        title: "Key Achievement #1",
                        type: "paragraph",
                        required: true
                    },
                    {
                        title: "Key Achievement #2",
                        type: "paragraph",
                        required: false
                    },
                    {
                        title: "Key Achievement #3",
                        type: "paragraph",
                        required: false
                    },
                    {
                        title: "Other Notable Wins",
                        type: "paragraph",
                        required: false
                    }
                ]
            },
            {
                title: "Metrics & Progress",
                description: "Quantifiable results and KPIs",
                columns: 2,
                questions: [
                    {
                        title: "Tasks Completed",
                        type: "text",
                        required: false
                    },
                    {
                        title: "Projects Advanced",
                        type: "text",
                        required: false
                    },
                    {
                        title: "Goals Progress",
                        type: "choice",
                        options: ["110%+ Ahead", "100% On Target", "75-99% Mostly On Track", "50-74% Behind", "Below 50% Critical"],
                        required: true
                    },
                    {
                        title: "Time Utilization",
                        type: "choice",
                        options: ["Very Productive", "Productive", "Average", "Below Average", "Struggled"],
                        required: true
                    },
                    {
                        title: "Key Metrics Achieved",
                        type: "paragraph",
                        required: false,
                        columnSpan: 2
                    }
                ]
            },
            {
                title: "Challenges & Blockers",
                description: "Issues encountered and their impact",
                questions: [
                    {
                        title: "Main Challenge #1",
                        type: "paragraph",
                        required: false
                    },
                    {
                        title: "Main Challenge #2",
                        type: "paragraph",
                        required: false
                    },
                    {
                        title: "Blockers (if any)",
                        type: "paragraph",
                        required: false
                    },
                    {
                        title: "How I'm Addressing These",
                        type: "paragraph",
                        required: false
                    }
                ]
            },
            {
                title: "Next Week's Focus",
                description: "Priorities and planned activities",
                questions: [
                    {
                        title: "Top Priority #1",
                        type: "text",
                        required: true
                    },
                    {
                        title: "Top Priority #2",
                        type: "text",
                        required: true
                    },
                    {
                        title: "Top Priority #3",
                        type: "text",
                        required: true
                    },
                    {
                        title: "Additional Priorities",
                        type: "paragraph",
                        required: false
                    },
                    {
                        title: "Expected Outcomes",
                        type: "paragraph",
                        required: false
                    }
                ]
            },
            {
                title: "Risks, Help & Learning",
                description: "Forward-looking insights and support needs",
                columns: 2,
                questions: [
                    {
                        title: "Potential Risks",
                        type: "paragraph",
                        required: false
                    },
                    {
                        title: "Help/Support Needed",
                        type: "paragraph",
                        required: false
                    },
                    {
                        title: "Key Learnings",
                        type: "paragraph",
                        required: false,
                        columnSpan: 2
                    },
                    {
                        title: "Suggestions for Improvement",
                        type: "paragraph",
                        required: false,
                        columnSpan: 2
                    }
                ]
            }
        ]
    };

    return <FormRenderer formDef={formDef} />;
}

