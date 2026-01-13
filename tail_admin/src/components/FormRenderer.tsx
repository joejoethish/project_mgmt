import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FormDefinition, FormItem, Section } from '../types/schema';

type Props = {
    formDef: FormDefinition;
};

export default function FormRenderer({ formDef }: Props) {

    const {
        register,
        handleSubmit,
        formState: { errors },
        trigger,
        getValues,
        watch,
        reset,
    } = useForm();

    // Auto-save key based on form title or ID
    const STORAGE_KEY = `form_draft_${formDef.title.replace(/\s+/g, '_')}`;

    // Load draft on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                reset(parsed);
                console.log('Restored draft from local storage');
            } catch (e) {
                console.error('Failed to parse draft', e);
            }
        }
    }, [STORAGE_KEY, reset]);

    // Save draft on change
    useEffect(() => {
        const subscription = watch((value) => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        });
        return () => subscription.unsubscribe();
    }, [watch, STORAGE_KEY]);

    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [canSubmit, setCanSubmit] = useState(false);

    const sections: Section[] = formDef.sections || (formDef.items ? [{
        title: formDef.title,
        questions: formDef.items,
    }] : []);

    const totalSteps = sections.length + 1;
    const currentSection = sections[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === totalSteps - 1;
    const isReviewStep = currentStep === sections.length;

    const onSubmit = async (data: any) => {
        if (!isLastStep || !canSubmit) return;

        setIsSubmitting(true);
        setError(null);
        try {
            // Convert form title to form_type slug
            const formType = formDef.title.toLowerCase().replace(/\s+/g, '-');

            const response = await fetch('/api/forms/submit/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    form_type: formType,
                    form_title: formDef.title,
                    submission_data: data
                }),
            });

            if (!response.ok) {
                const resData = await response.json().catch(() => ({ error: 'Submission failed' }));
                throw new Error(resData.error || resData.message || 'Submission failed');
            }

            const result = await response.json();
            console.log('Form submitted successfully:', result);

            // Clear draft on success
            localStorage.removeItem(STORAGE_KEY);

            setIsSuccess(true);
            setCanSubmit(false);
        } catch (err: any) {
            console.error('Form submission error:', err);
            setError(err.message || 'Failed to submit form. Please try again.');
            setCanSubmit(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = async () => {
        if (!isReviewStep) {
            const currentFields = currentSection.questions.map((q: FormItem) => q.id || q.title);
            const isValid = await trigger(currentFields);
            if (!isValid) return;
        }

        if (!isLastStep) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
            e.preventDefault();
            if (!isLastStep) handleNext();
        }
    };

    const handlePrevious = () => {
        if (!isFirstStep) {
            setCurrentStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSubmitClick = () => {
        setCanSubmit(true);
    };

    const handleEditSection = (sectionIndex: number) => {
        setCurrentStep(sectionIndex);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const renderReviewPage = () => {
        const formData = getValues();

        return (
            <div className="space-y-6 animate-fadeIn">
                <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/30 dark:via-green-900/20 dark:to-teal-900/30 border-l-4 border-emerald-500 dark:border-emerald-400 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-emerald-500 dark:bg-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">Review Your Answers</h3>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">Please review all your responses below before submitting. You can edit any section by clicking the Edit button.</p>
                        </div>
                    </div>
                </div>

                {sections.map((section, sectionIdx) => {
                    const sectionHasData = section.questions.some((q: FormItem) => {
                        const value = formData[q.title];
                        return value !== undefined && value !== '' && value !== null;
                    });

                    if (!sectionHasData) return null;

                    return (
                        <div key={sectionIdx} className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:-translate-y-1">
                            <div className="bg-gradient-to-r from-brand-50 via-blue-50 to-indigo-50 dark:from-brand-900/30 dark:via-blue-900/20 dark:to-indigo-900/30 px-6 py-5 border-b border-brand-100 dark:border-brand-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-brand-500 dark:bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
                                        {sectionIdx + 1}
                                    </div>
                                    <h3 className="text-lg font-bold text-brand-900 dark:text-brand-100">
                                        {section.title}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleEditSection(sectionIdx)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-50 dark:hover:bg-gray-600 transition-all text-sm font-semibold border-2 border-brand-200 dark:border-brand-500 hover:border-brand-400 dark:hover:border-brand-400 shadow-sm hover:shadow-md"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Edit</span>
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                {section.questions.map((question: FormItem) => {
                                    const value = formData[question.id || question.title];
                                    if (value === undefined || value === '' || value === null) return null;

                                    const displayValue = Array.isArray(value) ? value.join(', ') : value;

                                    return (
                                        <div key={question.title} className="border-b border-gray-100 dark:border-gray-700 pb-5 last:border-0 last:pb-0">
                                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2.5 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-brand-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                                </svg>
                                                {question.title}
                                            </p>
                                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-750 px-5 py-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                                <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">
                                                    {displayValue || <span className="text-gray-400 dark:text-gray-500 italic">No answer provided</span>}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-12 text-center max-w-md animate-scaleIn">
                    <div className="relative mx-auto mb-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto shadow-xl animate-bounce-slow">
                            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full animate-ping"></div>
                    </div>
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent mb-4">
                        Thank You!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">Your response has been recorded successfully.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-4 bg-gradient-to-r from-brand-500 to-blue-600 text-white rounded-xl hover:from-brand-600 hover:to-blue-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        Submit Another Response
                    </button>
                </div>
            </div>
        );
    }

    const renderQuestion = (item: FormItem) => {
        const colSpan = item.columnSpan || 1;
        const isRequired = item.required;
        const fieldId = item.id || item.title;

        return (
            <div
                key={fieldId}
                className="flex flex-col gap-3 animate-slideIn question-item"
                style={{ '--col-span': colSpan } as React.CSSProperties}
            >
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <svg className="w-5 h-5 text-brand-500 dark:text-brand-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span className="flex-1">
                        {item.title}
                        {isRequired && <span className="text-red-500 dark:text-red-400 ml-1.5 font-bold">*</span>}
                    </span>
                </label>

                {(item.type === 'text' || item.type === 'short' || item.type === 'date') && (
                    <input
                        {...register(fieldId, { required: isRequired })}
                        type={item.type === 'date' ? 'date' : 'text'}
                        className="px-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400 dark:focus:border-brand-400 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm focus:shadow-md"
                        placeholder={item.placeholder || (item.type === 'date' ? '' : "Your answer...")}
                    />
                )}

                {item.type === 'paragraph' && (
                    <textarea
                        {...register(fieldId, { required: isRequired })}
                        className="px-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400 dark:focus:border-brand-400 outline-none transition-all min-h-[140px] resize-y placeholder-gray-400 dark:placeholder-gray-500 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm focus:shadow-md"
                        placeholder={item.placeholder || "Your detailed answer..."}
                    />
                )}

                {(item.type === 'choice' || item.type === 'multiple_choice') && (
                    <div className="space-y-3 mt-2">
                        {item.options?.map((opt) => (
                            <label key={opt} className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-brand-300 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer transition-all group shadow-sm hover:shadow-md">
                                <input
                                    {...register(fieldId, { required: isRequired })}
                                    type="radio"
                                    value={opt}
                                    className="w-5 h-5 text-brand-600 border-gray-300 dark:border-gray-500 focus:ring-brand-500 dark:focus:ring-brand-400 cursor-pointer"
                                />
                                <span className="text-gray-700 dark:text-gray-300 group-hover:text-brand-700 dark:group-hover:text-brand-300 font-medium flex-1">{opt}</span>
                                <svg className="w-5 h-5 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </label>
                        ))}
                    </div>
                )}

                {item.type === 'rating' && (
                  <div className="flex flex-col gap-2 mt-2">
                     <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                      {item.options?.map((opt, idx) => {
                          // Expected format: "1 - Label" or just "Label"
                          const ratingVal = opt.split(' - ')[0] || String(idx + 1);
                          return (
                            <label key={opt} className="flex flex-col items-center gap-2 cursor-pointer group">
                                <input
                                    {...register(fieldId, { required: isRequired })}
                                    type="radio"
                                    value={opt}
                                    className="peer sr-only"
                                />
                                <div className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold transition-all peer-checked:border-brand-500 peer-checked:bg-brand-500 peer-checked:text-white peer-checked:scale-110 group-hover:border-brand-300 dark:group-hover:border-brand-600">
                                    {ratingVal}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center max-w-[80px] leading-tight peer-checked:text-brand-600 dark:peer-checked:text-brand-400">
                                    {opt.includes('-') ? opt.split(' - ').slice(1).join(' - ') : opt}
                                </span>
                            </label>
                          );
                      })}
                     </div>
                  </div>
                )}

                {item.type === 'select' && (
                    <div className="relative">
                        <select
                            {...register(fieldId, { required: isRequired })}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:focus:ring-brand-400 dark:focus:border-brand-400 outline-none transition-all cursor-pointer hover:border-gray-300 dark:hover:border-gray-500 shadow-sm focus:shadow-md appearance-none pr-10"
                        >
                            <option value="">-- Select {item.title} --</option>
                            {item.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500 dark:text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                )}

                {item.type === 'checkbox' && (
                    <div className="space-y-3 mt-2">
                        {item.options?.map((opt) => (
                            <label key={opt} className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-brand-300 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer transition-all group shadow-sm hover:shadow-md">
                                <input
                                    {...register(fieldId)}
                                    type="checkbox"
                                    value={opt}
                                    className="w-5 h-5 text-brand-600 border-gray-300 dark:border-gray-500 rounded-md focus:ring-brand-500 dark:focus:ring-brand-400 cursor-pointer"
                                />
                                <span className="text-gray-700 dark:text-gray-300 group-hover:text-brand-700 dark:group-hover:text-brand-300 font-medium flex-1">{opt}</span>
                                <svg className="w-5 h-5 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </label>
                        ))}
                    </div>
                )}

                {errors[fieldId] && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1.5 animate-shake">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        This field is required
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 pb-8">
            <div className="flex-1 max-w-full mx-auto w-full p-4 md:p-6">
                
                <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleFormKeyDown} className="h-full max-w-[1600px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                        
                        {/* LEFT COLUMN - Sticky Info Panel */}
                        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{formDef.title}</h1>
                                {formDef.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{formDef.description}</p>
                                )}

                                {/* Progress */}
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-2 text-sm font-medium">
                                        <span className="text-gray-700 dark:text-gray-300">
                                            Step {currentStep + 1} of {totalSteps}
                                        </span>
                                        <span className="text-brand-600 dark:text-brand-400">
                                            {Math.round(((currentStep + 1) / totalSteps) * 100)}%
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 rounded-full"
                                            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                                        {isReviewStep ? 'Review Submission' : currentSection.title}
                                    </h2>
                                    {isReviewStep ? (
                                         <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Please review your answers carefully before submitting. You can go back to edit any section.
                                         </p>
                                    ) : (
                                        currentSection.description && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {currentSection.description}
                                            </p>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN - Form Content */}
                        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 flex-1">
                                {!isReviewStep ? (
                                    <div
                                        className="grid gap-6 form-grid"
                                        style={{ '--cols': currentSection.columns || 2 } as React.CSSProperties}
                                    >
                                        {currentSection.questions.map(renderQuestion)}
                                    </div>
                                ) : (
                                    renderReviewPage()
                                )}

                                {/* Error Message inside the card */}
                                {error && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md mt-6 text-sm flex items-start gap-2">
                                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{error}</span>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sticky bottom-4 z-10 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    disabled={isFirstStep}
                                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${isFirstStep
                                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                                        }`}
                                >
                                    Previous
                                </button>

                                {!isLastStep ? (
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium text-sm flex items-center gap-2"
                                    >
                                        Next
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        onClick={handleSubmit(onSubmit)}
                                        className={`px-8 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium text-sm flex items-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit Form'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <style>{`
                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                }
                @media (min-width: 768px) {
                    .form-grid {
                        grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
                    }
                }
                .question-item {
                    grid-column: span 1;
                }
                @media (min-width: 768px) {
                    .question-item {
                        grid-column: span var(--col-span, 1);
                    }
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideIn {
                    animation: slideIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}

