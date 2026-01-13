import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router';
import { toast, Toaster } from 'react-hot-toast';

const API_BASE = 'http://192.168.1.26:8000/api/github';

interface PullRequest {
  pr_id: string;
  number: number;
  title: string;
  repository_name: string;
}

const PeerReviewForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState({
    pull_request: '',
    reviewer_name: '',
    reviewee_name: '',
    code_quality: 3,
    communication: 3,
    timeliness: 3,
    documentation: 3,
    strengths: '',
    improvements: '',
    comments: '',
    review_period_start: '',
    review_period_end: '',
  });

  // Fetch PRs for dropdown
  const { data: prs } = useQuery<PullRequest[]>({
    queryKey: ['github-prs-dropdown'],
    queryFn: async () => (await axios.get(`${API_BASE}/prs/`)).data
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return axios.post(`${API_BASE}/reviews/`, {
        ...data,
        pull_request: data.pull_request || null,
      });
    },
    onSuccess: () => {
      toast.success('Peer review submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['github-reviews'] });
      setTimeout(() => navigate('/github'), 1500);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reviewer_name || !formData.reviewee_name) {
      toast.error('Please fill in reviewer and reviewee names');
      return;
    }
    submitMutation.mutate(formData);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const ratingLabels = ['Needs Improvement', 'Below Average', 'Average', 'Good', 'Excellent'];

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <Toaster position="top-center" />
      
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <span className="text-3xl">👥</span> Submit Peer Review
          </h1>
          <p className="text-gray-500 mt-1">Provide feedback on code quality, communication, and collaboration</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          
          {/* Section: Basic Info */}
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Review Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reviewer (You) *
                </label>
                <input
                  type="text"
                  value={formData.reviewer_name}
                  onChange={(e) => handleChange('reviewer_name', e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reviewee (Person being reviewed) *
                </label>
                <input
                  type="text"
                  value={formData.reviewee_name}
                  onChange={(e) => handleChange('reviewee_name', e.target.value)}
                  placeholder="Team member's name"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Related Pull Request (Optional)
              </label>
              <select
                value={formData.pull_request}
                onChange={(e) => handleChange('pull_request', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">-- Select a PR (optional) --</option>
                {prs?.map(pr => (
                  <option key={pr.pr_id} value={pr.pr_id}>
                    #{pr.number} - {pr.title} ({pr.repository_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Review Period Start
                </label>
                <input
                  type="date"
                  value={formData.review_period_start}
                  onChange={(e) => handleChange('review_period_start', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Review Period End
                </label>
                <input
                  type="date"
                  value={formData.review_period_end}
                  onChange={(e) => handleChange('review_period_end', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Section: Ratings */}
          <div className="p-6 border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Performance Ratings</h2>
            
            <div className="space-y-6">
              <RatingField
                label="Code Quality"
                description="Quality of code written, best practices, readability"
                value={formData.code_quality}
                onChange={(val) => handleChange('code_quality', val)}
                labels={ratingLabels}
              />
              
              <RatingField
                label="Communication"
                description="Clarity in PR descriptions, responsiveness to feedback"
                value={formData.communication}
                onChange={(val) => handleChange('communication', val)}
                labels={ratingLabels}
              />
              
              <RatingField
                label="Timeliness"
                description="Speed of delivery and response to reviews"
                value={formData.timeliness}
                onChange={(val) => handleChange('timeliness', val)}
                labels={ratingLabels}
              />
              
              <RatingField
                label="Documentation"
                description="Quality of comments, docs, and code explanations"
                value={formData.documentation}
                onChange={(val) => handleChange('documentation', val)}
                labels={ratingLabels}
              />
            </div>
          </div>

          {/* Section: Feedback */}
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-white mb-4">Written Feedback</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Strengths 💪
                </label>
                <textarea
                  value={formData.strengths}
                  onChange={(e) => handleChange('strengths', e.target.value)}
                  placeholder="What did they do well?"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Areas for Improvement 📈
                </label>
                <textarea
                  value={formData.improvements}
                  onChange={(e) => handleChange('improvements', e.target.value)}
                  placeholder="What could be improved?"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Additional Comments
                </label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => handleChange('comments', e.target.value)}
                  placeholder="Any other feedback..."
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 bg-gray-50 dark:bg-gray-700/30 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/github')}
              className="px-6 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitMutation.isPending ? (
                <>
                  <span className="animate-spin">⏳</span> Submitting...
                </>
              ) : (
                <>✓ Submit Review</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Rating Field Component
interface RatingFieldProps {
  label: string;
  description: string;
  value: number;
  onChange: (val: number) => void;
  labels: string[];
}

const RatingField = ({ label, description, value, onChange, labels }: RatingFieldProps) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div>
          <span className="font-medium text-gray-800 dark:text-gray-200">{label}</span>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <span className="text-sm text-indigo-600 font-medium">{labels[value - 1]}</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              value === rating
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PeerReviewForm;
