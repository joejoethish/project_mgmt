import FormRenderer from '../components/FormRenderer';
import { FormDefinition } from '../types/schema';

export default function PeerReviewPage() {
    const formDef: FormDefinition = {
        title: "360° Peer Review Feedback",
        description: "Provide comprehensive, constructive feedback to support your colleague's professional development",
        sections: [
            {
                title: "Review Context",
                description: "Basic information about this peer review",
                columns: 2,
                questions: [
                    {
                        title: "Your Name",
                        type: "text",
                        required: true
                    },
                    {
                        title: "Your Role/Department",
                        type: "text",
                        required: true
                    },
                    {
                        title: "Colleague Being Reviewed",
                        type: "text",
                        required: true
                    },
                    {
                        title: "Their Role/Department",
                        type: "text",
                        required: true
                    },
                    {
                        title: "Review Period",
                        type: "text",
                        required: true
                    },
                    {
                        title: "How often do you work with this person?",
                        type: "choice",
                        options: ["Daily", "Weekly", "Monthly", "Occasionally"],
                        required: true
                    }
                ]
            },
            {
                title: "Core Competencies Assessment",
                description: "Rate your colleague's performance across key competencies",
                columns: 2,
                questions: [
                    {
                        title: "Technical Skills & Expertise",
                        type: "choice",
                        options: ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Developing", "Needs Improvement"],
                        required: true
                    },
                    {
                        title: "Quality of Work",
                        type: "choice",
                        options: ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Developing", "Needs Improvement"],
                        required: true
                    },
                    {
                        title: "Communication Skills",
                        type: "choice",
                        options: ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Developing", "Needs Improvement"],
                        required: true
                    },
                    {
                        title: "Collaboration & Teamwork",
                        type: "choice",
                        options: ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Developing", "Needs Improvement"],
                        required: true
                    },
                    {
                        title: "Problem Solving & Innovation",
                        type: "choice",
                        options: ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Developing", "Needs Improvement"],
                        required: true
                    },
                    {
                        title: "Time Management & Reliability",
                        type: "choice",
                        options: ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Developing", "Needs Improvement"],
                        required: true
                    },
                    {
                        title: "Initiative & Ownership",
                        type: "choice",
                        options: ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Developing", "Needs Improvement"],
                        required: true
                    },
                    {
                        title: "Adaptability & Learning",
                        type: "choice",
                        options: ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Developing", "Needs Improvement"],
                        required: true
                    }
                ]
            },
            {
                title: "Leadership & Impact",
                description: "Assess leadership qualities and overall contribution",
                columns: 2,
                questions: [
                    {
                        title: "Mentoring & Helping Others",
                        type: "choice",
                        options: ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Developing", "Needs Improvement"],
                        required: true
                    },
                    {
                        title: "Decision Making",
                        type: "choice",
                        options: ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Developing", "Needs Improvement"],
                        required: true
                    },
                    {
                        title: "Impact on Team Success",
                        type: "choice",
                        options: ["Very High", "High", "Moderate", "Low", "Very Low"],
                        required: true
                    },
                    {
                        title: "Overall Contribution",
                        type: "choice",
                        options: ["Exceptional", "Very Strong", "Strong", "Adequate", "Below Expected"],
                        required: true
                    }
                ]
            },
            {
                title: "Detailed Feedback",
                description: "Provide specific examples and actionable suggestions",
                questions: [
                    {
                        title: "Key Strengths (List 2-3 specific strengths)",
                        type: "paragraph",
                        required: true
                    },
                    {
                        title: "Significant Accomplishments (What did they excel at?)",
                        type: "paragraph",
                        required: true
                    },
                    {
                        title: "Areas for Growth (What can be improved?)",
                        type: "paragraph",
                        required: true
                    },
                    {
                        title: "Specific Examples (Provide concrete situations)",
                        type: "paragraph",
                        required: false
                    },
                    {
                        title: "Actionable Recommendations (How can they improve?)",
                        type: "paragraph",
                        required: true
                    },
                    {
                        title: "Additional Comments",
                        type: "paragraph",
                        required: false
                    }
                ]
            }
        ]
    };

    return <FormRenderer formDef={formDef} />;
}

