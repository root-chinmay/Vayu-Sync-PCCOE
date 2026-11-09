'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  PhoneCall, 
  ShieldAlert, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle2, 
  Star, 
  Send, 
  Copy, 
  ExternalLink,
  Flame,
  HeartPulse,
  Users,
  CloudSun,
  Sprout,
  Shield,
  LifeBuoy,
  Trophy,
  Award,
  Sparkles,
  RotateCw,
  ChevronRight,
  Medal,
  UserCheck
} from 'lucide-react';
import { EmergencyContact, HelplineCategory, LeaderboardEntry, CurrentUserLeaderboardInfo } from '../lib/types';
import { fetchEmergencyContacts, submitFeedback, submitIssueReport, fetchNationalLeaderboard } from '../lib/api';
import { useLanguage } from '../hooks/useLanguage';

function getOrInitUserId(): string {
  if (typeof window === 'undefined') return 'guest_user';
  try {
    let uid = localStorage.getItem('vayusync_user_id');
    if (!uid) {
      uid = 'usr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem('vayusync_user_id', uid);
    }
    return uid;
  } catch {
    return 'guest_user';
  }
}

interface HelpReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity?: string;
  lat?: number;
  lon?: number;
  userName?: string;
}

type ModalTab = 'emergency' | 'helplines' | 'feedback' | 'report';

export const HelpReportModal: React.FC<HelpReportModalProps> = ({
  isOpen,
  onClose,
  currentCity = 'Pune',
  lat,
  lon,
  userName,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ModalTab>('emergency');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  // Data from backend
  const [emergencyNumbers, setEmergencyNumbers] = useState<EmergencyContact[]>([]);
  const [helplineCategories, setHelplineCategories] = useState<HelplineCategory[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // Feedback form state
  const [fbName, setFbName] = useState('');
  const [fbEmail, setFbEmail] = useState('');
  const [fbCategory, setFbCategory] = useState('Forecast Accuracy');
  const [fbRating, setFbRating] = useState(5);
  const [fbComment, setFbComment] = useState('');
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbSuccessMsg, setFbSuccessMsg] = useState<string | null>(null);
  const [fbErrorMsg, setFbErrorMsg] = useState<string | null>(null);

  // Feedback sub-tab and real-time National Leaderboard state
  const [fbSubTab, setFbSubTab] = useState<'form' | 'leaderboard'>('form');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [currentUserRankInfo, setCurrentUserRankInfo] = useState<CurrentUserLeaderboardInfo | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [feedbackPointsResult, setFeedbackPointsResult] = useState<{
    points_awarded?: number;
    total_points?: number;
    national_rank?: number;
  } | null>(null);

  // Issue report form state
  const [issueCategory, setIssueCategory] = useState('Severe Weather Discrepancy');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueSuccessTicket, setIssueSuccessTicket] = useState<string | null>(null);
  const [issueErrorMsg, setIssueErrorMsg] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true);
    setLeaderboardError(null);
    try {
      const uid = getOrInitUserId();
      const res = await fetchNationalLeaderboard(uid);
      setLeaderboardData(res.leaderboard || []);
      setCurrentUserRankInfo(res.currentUser || null);
    } catch (err: any) {
      setLeaderboardError(err.message || 'Failed to load leaderboard');
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'feedback') {
      loadLeaderboard();
    }
  }, [isOpen, activeTab, loadLeaderboard]);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoadingContacts(true);
    fetchEmergencyContacts()
      .then((data) => {
        if (!mounted) return;
        setEmergencyNumbers(data.emergency_numbers || []);
        setHelplineCategories(data.helpline_categories || []);
      })
      .catch((err) => console.error('Failed to load emergency contacts', err))
      .finally(() => {
        if (mounted) setIsLoadingContacts(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const getContactIcon = (icon: string) => {
    switch (icon) {
      case 'flame': return <Flame className="w-5 h-5 text-red-400" />;
      case 'heart-pulse': return <HeartPulse className="w-5 h-5 text-emerald-400" />;
      case 'shield-alert': return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      case 'life-buoy': return <LifeBuoy className="w-5 h-5 text-blue-400" />;
      case 'users': return <Users className="w-5 h-5 text-purple-400" />;
      case 'cloud-sun': return <CloudSun className="w-5 h-5 text-cyan-400" />;
      case 'sprout': return <Sprout className="w-5 h-5 text-lime-400" />;
      case 'shield': return <Shield className="w-5 h-5 text-blue-400" />;
      default: return <PhoneCall className="w-5 h-5 text-cyan-400" />;
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanComment = fbComment.trim();
    if (!cleanComment || cleanComment.length < 5) {
      setFbErrorMsg('Feedback comments must be at least 5 characters long.');
      return;
    }

    setFbSubmitting(true);
    setFbErrorMsg(null);
    setFbSuccessMsg(null);
    setFeedbackPointsResult(null);

    try {
      const uid = getOrInitUserId();
      const res = await submitFeedback({
        user_id: uid,
        name: fbName.trim() || userName || undefined,
        email: fbEmail.trim() || undefined,
        category: fbCategory,
        rating: fbRating,
        comment: cleanComment,
        location: currentCity,
      });
      setFbSuccessMsg(res.message || 'Feedback recorded in VayuSync database!');
      setFeedbackPointsResult({
        points_awarded: res.points_awarded,
        total_points: res.total_points,
        national_rank: res.national_rank,
      });
      setFbComment('');
      loadLeaderboard();
    } catch (err: any) {
      setFbErrorMsg(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setFbSubmitting(false);
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueDesc.trim()) return;

    setIssueSubmitting(true);
    setIssueErrorMsg(null);
    setIssueSuccessTicket(null);

    try {
      const res = await submitIssueReport({
        category: issueCategory,
        description: issueDesc.trim(),
        location_name: currentCity,
        lat,
        lon,
        app_version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
      setIssueSuccessTicket(res.ticket_number || 'MAUSAM-RESOLVED');
      setIssueDesc('');
    } catch (err: any) {
      setIssueErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIssueSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/90">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              {t.help_modal_title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.help_modal_subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-100 dark:border-slate-800 flex space-x-2 overflow-x-auto bg-slate-50/40 dark:bg-slate-900/40 py-2.5">
          <button
            onClick={() => setActiveTab('emergency')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'emergency'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <PhoneCall className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{t.tab_emergency}</span>
          </button>

          <button
            onClick={() => setActiveTab('helplines')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'helplines'
                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>{t.tab_helplines}</span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'feedback'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{t.tab_feedback}</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'report'
                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{t.tab_report_issue}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: EMERGENCY CONTACTS */}
          {activeTab === 'emergency' && (
            <div className="space-y-3">
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-3.5 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5 mb-4 shadow-xs">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <p>
                  In immediate life-threatening situations, call <strong>112</strong> immediately. Calls to national emergency numbers are toll-free from any network across India.
                </p>
              </div>

              {isLoadingContacts ? (
                <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">Loading verified national contacts...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {emergencyNumbers.map((c, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs">
                            {getContactIcon(c.icon)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{c.service}</div>
                            <span className="text-[10px] text-sky-700 dark:text-sky-400 font-semibold">{c.badge}</span>
                          </div>
                        </div>
                        {c.priority === 'critical' && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                            Critical
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                        {c.description}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <a
                          href={`tel:${c.number}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>{c.number}</span>
                        </a>

                        <button
                          onClick={() => handleCopyNumber(c.number)}
                          className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition text-xs shadow-xs"
                          title="Copy Number"
                        >
                          {copiedNumber === c.number ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SPECIALIZED HELPLINES */}
          {activeTab === 'helplines' && (
            <div className="space-y-5">
              {helplineCategories.map((cat, idx) => (
                <div key={idx} className="bg-slate-50/70 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>{cat.category}</span>
                  </h4>

                  <div className="space-y-2.5">
                    {cat.contacts.map((contact, cIdx) => (
                      <div
                        key={cIdx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">{contact.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{contact.hours}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {contact.number.includes('@') ? (
                            <a
                              href={`mailto:${contact.number}`}
                              className="text-xs font-mono text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                            >
                              <span>{contact.number}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <a
                              href={`tel:${contact.number}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-sky-700 dark:text-sky-300 text-xs font-bold font-mono transition shadow-xs"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>{contact.number}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: FEEDBACK & NATIONAL LEADERBOARD */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              {/* Feedback vs Leaderboard Sub-tab Navigation */}
              <div className="flex items-center justify-between gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFbSubTab('form')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    fbSubTab === 'form'
                      ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t.lb_tab_form}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFbSubTab('leaderboard');
                    loadLeaderboard();
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    fbSubTab === 'leaderboard'
                      ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t.lb_tab_leaderboard}</span>
                </button>
              </div>

              {fbSubTab === 'form' ? (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  {/* Points Incentive Banner */}
                  <div className="bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-indigo-500/10 border border-amber-300/40 dark:border-amber-700/40 rounded-2xl p-3 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {t.lb_pts_incentive}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFbSubTab('leaderboard');
                        loadLeaderboard();
                      }}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap flex items-center gap-1"
                    >
                      <span>{t.lb_tab_leaderboard}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {fbSuccessMsg && (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200 text-xs space-y-2 shadow-xs animate-in fade-in">
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{fbSuccessMsg}</span>
                      </div>
                      {feedbackPointsResult && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-[11px]">
                          {feedbackPointsResult.points_awarded !== undefined && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-black">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              +{feedbackPointsResult.points_awarded} {t.lb_points}
                            </span>
                          )}
                          {feedbackPointsResult.total_points !== undefined && (
                            <span className="text-slate-600 dark:text-slate-300 font-medium">
                              {t.lb_your_points}: <strong className="font-bold text-slate-900 dark:text-white">{feedbackPointsResult.total_points}</strong>
                            </span>
                          )}
                          {feedbackPointsResult.national_rank !== undefined && (
                            <span className="text-slate-600 dark:text-slate-300 font-medium">
                              • {t.lb_your_rank}: <strong className="font-bold text-sky-600 dark:text-sky-400">#{feedbackPointsResult.national_rank}</strong>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFbSubTab('leaderboard');
                              loadLeaderboard();
                            }}
                            className="ml-auto font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-0.5"
                          >
                            <span>{t.lb_tab_leaderboard}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {fbErrorMsg && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 shadow-xs">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>{fbErrorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Your Name (Optional)</label>
                      <input
                        type="text"
                        value={fbName}
                        onChange={(e) => setFbName(e.target.value)}
                        placeholder={userName ? `e.g. ${userName}` : "e.g. Rahul Sharma"}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email (Optional)</label>
                      <input
                        type="email"
                        value={fbEmail}
                        onChange={(e) => setFbEmail(e.target.value)}
                        placeholder="rahul@example.com"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t.feedback_category}</label>
                      <select
                        value={fbCategory}
                        onChange={(e) => setFbCategory(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-xs"
                      >
                        <option value="Forecast Accuracy">Forecast Accuracy</option>
                        <option value="Personalization Relevance">Personalization Relevance</option>
                        <option value="UI / Ease of Use">UI / Ease of Use</option>
                        <option value="Severe Weather Alert Timing">Severe Weather Alert Timing</option>
                        <option value="Feature Suggestion">Feature Suggestion</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t.feedback_rating}</label>
                      <div className="flex items-center gap-1.5 pt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFbRating(star)}
                            className="p-1 text-slate-300 dark:text-slate-600 hover:text-amber-500 transition"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= fbRating ? 'fill-amber-400 text-amber-500' : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs text-slate-600 dark:text-slate-400 ml-2 font-medium">({fbRating}/5)</span>
                      </div>
                    </div>
                  </div>

                  {/* Multiline Comment Textarea with strict 0/500 character counter */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.feedback_comment}</label>
                      <span
                        className={`text-[11px] font-mono font-semibold ${
                          fbComment.length > 450 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {fbComment.length}/500 {t.feedback_char_limit}
                      </span>
                    </div>
                    <textarea
                      required
                      rows={4}
                      maxLength={500}
                      value={fbComment}
                      onChange={(e) => setFbComment(e.target.value)}
                      placeholder="Share your experience with MAUSAM forecasts, report local weather variations, or suggest enhancements..."
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed resize-none shadow-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={fbSubmitting || !fbComment.trim() || fbComment.trim().length < 5}
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
                  >
                    {fbSubmitting ? (
                      <span>Saving to Database...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{t.feedback_submit}</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* LEADERBOARD VIEW */
                <div className="space-y-3.5">
                  {/* Sub-header with refresh button */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        {t.lb_title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.lb_subtitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={loadLeaderboard}
                      disabled={isLoadingLeaderboard}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-xs flex items-center gap-1 text-xs"
                      title="Refresh Leaderboard"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isLoadingLeaderboard ? 'animate-spin text-sky-500' : ''}`} />
                    </button>
                  </div>

                  {/* User's Position Card (Shows national rank and points) */}
                  {currentUserRankInfo && (
                    <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition ${
                      currentUserRankInfo.in_top_100
                        ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-xs border border-sky-500/20">
                          {currentUserRankInfo.rank ? `#${currentUserRankInfo.rank}` : '—'}
                        </div>
                        <div>
                          <p className="font-bold flex items-center gap-1.5">
                            <span>{currentUserRankInfo.name || userName || t.lb_anonymous}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-black uppercase tracking-wider">
                              {t.lb_you_badge}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {t.lb_your_position} {currentUserRankInfo.rank ? `(#${currentUserRankInfo.rank})` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                          {currentUserRankInfo.points} {t.lb_points}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Leaderboard content: Loading, Error, Empty, or Table */}
                  {isLoadingLeaderboard ? (
                    <div className="space-y-2 py-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 animate-pulse flex items-center px-4 justify-between">
                          <div className="w-24 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                          <div className="w-12 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                        </div>
                      ))}
                      <p className="text-center text-xs text-slate-400 pt-2">{t.lb_loading}</p>
                    </div>
                  ) : leaderboardError ? (
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-center space-y-2">
                      <p className="text-xs text-rose-800 dark:text-rose-300">{t.lb_error}</p>
                      <button
                        type="button"
                        onClick={loadLeaderboard}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition inline-flex items-center gap-1"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>{t.lb_retry}</span>
                      </button>
                    </div>
                  ) : leaderboardData.length === 0 ? (
                    <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                      <Award className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{t.lb_empty}</p>
                      <button
                        type="button"
                        onClick={() => setFbSubTab('form')}
                        className="px-4 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition inline-flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{t.lb_tab_form}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                        <div className="col-span-2 text-center">{t.lb_rank}</div>
                        <div className="col-span-7">{t.lb_contributor}</div>
                        <div className="col-span-3 text-right">{t.lb_points}</div>
                      </div>

                      {/* Top 100 Scrollable Rows */}
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[340px] overflow-y-auto">
                        {leaderboardData.map((row) => (
                          <div
                            key={row.rank}
                            className={`grid grid-cols-12 gap-2 px-3 py-2.5 items-center text-xs transition ${
                              row.is_current_user
                                ? 'bg-sky-50 dark:bg-sky-950/40 font-semibold'
                                : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            {/* Rank Column with Medals for Top 3 */}
                            <div className="col-span-2 text-center font-black">
                              {row.rank === 1 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs shadow-xs" title="1st Place">
                                  🥇
                                </span>
                              ) : row.rank === 2 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs shadow-xs" title="2nd Place">
                                  🥈
                                </span>
                              ) : row.rank === 3 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-200/60 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-xs shadow-xs" title="3rd Place">
                                  🥉
                                </span>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400 text-xs">#{row.rank}</span>
                              )}
                            </div>

                            {/* Contributor Name */}
                            <div className="col-span-7 flex items-center gap-1.5 min-w-0">
                              <span className="truncate text-slate-800 dark:text-slate-200 font-medium">
                                {row.name || t.lb_anonymous}
                              </span>
                              {row.is_current_user && (
                                <span className="flex-shrink-0 text-[9px] px-1.5 py-0.2 rounded bg-sky-600 text-white font-black uppercase">
                                  {t.lb_you_badge}
                                </span>
                              )}
                            </div>

                            {/* Points Column */}
                            <div className="col-span-3 text-right font-black text-amber-600 dark:text-amber-400 font-mono">
                              {row.points}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REPORT AN ISSUE */}
          {activeTab === 'report' && (
            <form onSubmit={handleIssueSubmit} className="space-y-4">
              {issueSuccessTicket && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs space-y-1 shadow-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{t.issue_success}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 pl-7">
                    Ticket Reference: <strong className="font-mono text-sky-700 dark:text-sky-400">{issueSuccessTicket}</strong>. Telemetry logged for meteorological review.
                  </p>
                </div>
              )}

              {issueErrorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 shadow-xs">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{issueErrorMsg}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t.issue_category}</label>
                <select
                  value={issueCategory}
                  onChange={(e) => setIssueCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-xs"
                >
                  <option value="Severe Weather Discrepancy">Severe Weather Discrepancy (Rain/Storm not reported)</option>
                  <option value="Road Waterlogging / Water Logging Spot">Road Waterlogging / Inundation Spot</option>
                  <option value="Station Sensor Anomaly">Station Sensor Anomaly (Erroneous Temperature / AQI)</option>
                  <option value="Application Technical Bug">Application Technical Bug</option>
                  <option value="Telemetry Delay">Telemetry Latency & Delay</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.issue_description}</label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{issueDesc.length}/1500 chars</span>
                </div>
                <textarea
                  required
                  rows={4}
                  maxLength={1500}
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  placeholder="Provide details about the issue: specific locality, time observed, road water stagnation depth, or sudden unpredicted weather shifts..."
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed resize-none shadow-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between shadow-xs">
                <span>Location Context: <strong className="text-slate-900 dark:text-white">{currentCity}</strong></span>
                {lat && lon && (
                  <span className="font-mono text-sky-700 dark:text-sky-400 font-medium">{lat.toFixed(4)}° N, {lon.toFixed(4)}° E</span>
                )}
              </div>

              <button
                type="submit"
                disabled={issueSubmitting || !issueDesc.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-xs"
              >
                {issueSubmitting ? (
                  <span>Logging Incident Telemetry...</span>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{t.issue_submit}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
