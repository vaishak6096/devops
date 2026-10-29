"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { CandidateProfile } from '@/lib/types';

const CATEGORY_PRESETS: Record<string, { domains: string[]; defaultExp: number }> = {
  "Backend / Java": {
    domains: ["Java", "Spring Boot", "Microservices", "Cloud", "AWS", "Backend", "SQL"],
    defaultExp: 8,
  },
  "DevOps / Cloud": {
    domains: ["DevOps", "AWS", "Azure", "Docker", "Kubernetes", "CI/CD", "Terraform"],
    defaultExp: 5,
  },
  "Data Engineering / Analytics": {
    domains: ["Data Engineer", "Snowflake", "ETL", "Python", "SQL", "BigQuery", "Analytics"],
    defaultExp: 5,
  },
  "Frontend / Web Development": {
    domains: ["React", "Next.js", "TypeScript", "JavaScript", "HTML/CSS", "Tailwind", "REST API"],
    defaultExp: 5,
  },
  "Full Stack": {
    domains: ["Full Stack", "Node.js", "React", "Java", "PostgreSQL", "Cloud", "Docker"],
    defaultExp: 6,
  },
  "QA / Testing": {
    domains: ["QA", "Playwright", "Selenium", "Automation Testing", "API Testing", "Jest"],
    defaultExp: 4,
  },
  "Mobile Development": {
    domains: ["iOS", "Android", "React Native", "Flutter", "Swift", "Kotlin"],
    defaultExp: 4,
  },
  ".NET": {
    domains: [".NET", "C#", "ASP.NET Core", "Azure", "SQL Server", "Microservices"],
    defaultExp: 6,
  },
};

export default function Dashboard() {
  const [profiles, setProfiles] = useState<CandidateProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>('1');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('All');
  const [isSearching, setIsSearching] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchStatusLog, setSearchStatusLog] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    workAuth: 'H1B',
    maxExperienceYears: 6,
    targetDomains: '',
    details: '',
    resume: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/profiles');
      if (!res.ok) {
        throw new Error(`Failed to fetch profiles: ${res.statusText}`);
      }
      const data: CandidateProfile[] = await res.json();
      setProfiles(data);
      if (data.length > 0 && !selectedProfileId) {
        setSelectedProfileId(data[0].id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to backend';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value;
    const preset = CATEGORY_PRESETS[cat];
    setFormData(prev => ({
      ...prev,
      category: cat,
      targetDomains: preset ? preset.domains.join(', ') : prev.targetDomains,
      maxExperienceYears: preset ? preset.defaultExp : prev.maxExperienceYears,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit');
        return;
      }
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !['pdf', 'docx'].includes(ext)) {
        alert('Only PDF and DOCX files are allowed');
        return;
      }
      setFormData(prev => ({ ...prev, resume: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.resume) {
      alert('Please upload a resume file (DOCX or PDF)');
      return;
    }

    setIsUploading(true);
    setError(null);

    const data = new FormData();
    data.append('name', formData.name);
    data.append('category', formData.category);
    data.append('workAuth', formData.workAuth);
    data.append('maxExperienceYears', String(formData.maxExperienceYears));
    data.append('targetDomains', formData.targetDomains);
    data.append('details', formData.details);
    data.append('resume', formData.resume);

    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload profile');
      }

      const newProfile: CandidateProfile = await response.json();
      await fetchProfiles();
      setSelectedProfileId(newProfile.id);
      setIsAdding(false);
      setFormData({
        name: '',
        category: '',
        workAuth: 'H1B',
        maxExperienceYears: 6,
        targetDomains: '',
        details: '',
        resume: null,
      });
      setSuccessMessage(`Successfully added candidate ${newProfile.name}! Anyone can now view and download their resume.`);
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const deleteProfile = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete profile for "${name}"?`)) return;
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete request failed');
      await fetchProfiles();
      if (selectedProfileId === id) {
        setSelectedProfileId(profiles.find(p => p.id !== id)?.id || null);
      }
      setSuccessMessage(`Deleted profile for ${name}`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setError('Failed to delete profile');
    }
  };

  const triggerSearch = async () => {
    if (!selectedProfileId) {
      alert('Please select an active profile first');
      return;
    }
    const active = profiles.find(p => p.id === selectedProfileId);
    if (!active) return;

    setIsSearching(true);
    setSearchModalOpen(true);
    setSearchStatusLog(`Initiating LinkedIn search session for ${active.name}...\nTarget Domain: ${active.category}\nMatching Resumes: ${active.resumeName}\nExperience Filter: <= ${active.maxExperienceYears} years.`);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfileId,
          settings: { targetApplicationsCount: 5 }
        }),
      });
      const data = await res.json();
      setSearchStatusLog(prev => `${prev}\n\n[Status: SUCCESS]\n${data.message}\nJob Run ID: ${data.searchId}\n\nCandidate pipeline is ready. Applications can be dispatched to recruiter posts!`);
    } catch {
      setSearchStatusLog(prev => `${prev}\n\n[Error] Unable to reach bot worker. Check configuration.`);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredProfiles = useMemo(() => {
    return profiles.filter(profile => {
      const matchesSearch =
        profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        profile.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        profile.targetDomains.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilter =
        selectedFilterCategory === 'All' || profile.category.toLowerCase().includes(selectedFilterCategory.toLowerCase());

      return matchesSearch && matchesFilter;
    });
  }, [profiles, searchQuery, selectedFilterCategory]);

  const activeCandidate = useMemo(() => {
    return profiles.find(p => p.id === selectedProfileId) || profiles[0] || null;
  }, [profiles, selectedProfileId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-900">
      {/* Background Decorative Gradient Spheres */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation / Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
              <span className="text-xs font-semibold tracking-wider uppercase text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-800/50">
                LinkedIn Recruiter Engine
              </span>
              <span className="text-xs font-medium text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-800">
                Vercel Cloud Ready
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Candidate Resume & Outreach Hub
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage candidate profiles, upload resumes, customize domain matching, and trigger automated outreach.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchProfiles}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all flex items-center gap-2 shadow-sm"
              title="Refresh candidate profiles from backend"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Candidate Resume
            </button>
          </div>
        </header>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-950/50 border border-red-800/80 text-red-200 rounded-2xl flex items-center justify-between text-sm backdrop-blur-sm animate-fadeIn">
            <div className="flex items-center gap-3">
              <span className="text-red-400 text-lg">⚠️</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold px-2">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 rounded-2xl flex items-center justify-between text-sm backdrop-blur-sm animate-fadeIn">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 text-lg">✓</span>
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300 font-bold px-2">✕</button>
          </div>
        )}

        {/* Top Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Enrolled</span>
              <span className="text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800/40">Live</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{profiles.length}</div>
            <p className="text-xs text-slate-400 mt-1">Candidates ready in database</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Active Target</span>
              <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/40">Ready</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2 truncate">
              {activeCandidate ? activeCandidate.name.split(' ')[0] : 'None'}
            </div>
            <p className="text-xs text-slate-400 mt-1 truncate">{activeCandidate?.category || 'No active candidate'}</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Resumes Staged</span>
              <span className="text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-800/40">DOCX/PDF</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              {profiles.filter(p => Boolean(p.resumeName)).length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Highlighter workflow ready</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Applications Sent</span>
              <span className="text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-800/40">Total</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              {profiles.reduce((acc, p) => acc + (p.applicationsSent || 0), 0)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Recruiter dispatches completed</p>
          </div>
        </div>

        {/* Active Candidate Automation Command Bar */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-800/30 shadow-xl backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Bot Target Candidate
              </span>
            </div>
            {activeCandidate ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xl font-bold text-white">{activeCandidate.name}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-cyan-800/40">
                  {activeCandidate.category}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Visa: {activeCandidate.workAuth}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Exp Limit: ≤ {activeCandidate.maxExperienceYears} yrs
                </span>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No candidate selected. Click on a candidate card below.</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeCandidate && (
              <a
                href={`/api/profiles/${activeCandidate.id}/resume`}
                target="_blank"
                rel="noreferrer"
                download={activeCandidate.resumeName}
                className="px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Resume ({activeCandidate.resumeName.split('.').pop()?.toUpperCase()})
              </a>
            )}
            <button
              onClick={triggerSearch}
              disabled={!activeCandidate || isSearching}
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Trigger Search & Outreach
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by candidate name, role, skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['All', 'Backend', 'DevOps', 'Data', 'Full Stack'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedFilterCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  selectedFilterCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Profiles Grid */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
            <p className="text-sm text-slate-400">Loading candidate profiles from backend...</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl p-8 bg-slate-900/30">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400 text-2xl">
              📄
            </div>
            <h3 className="text-lg font-bold text-slate-200">No Candidate Profiles Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {searchQuery
                ? `No candidate matched your query "${searchQuery}". Try a different keyword.`
                : 'Get started by uploading candidate resumes to the backend.'}
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all"
            >
              + Add First Resume
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => {
              const isSelected = selectedProfileId === profile.id;
              const initials = profile.name
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={profile.id}
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={`p-6 rounded-2xl transition-all cursor-pointer relative group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900/90 border-2 border-cyan-500 shadow-xl shadow-cyan-500/10'
                      : 'bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {profile.name}
                            </h3>
                            {isSelected && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950 border border-cyan-800/80 px-2 py-0.5 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{profile.category}</p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProfile(profile.id, profile.name);
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Delete profile"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Meta badges */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        Visa: {profile.workAuth}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        Max Exp: {profile.maxExperienceYears}y
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-emerald-300 border border-emerald-800/40">
                        Sent: {profile.applicationsSent || 0}
                      </span>
                    </div>

                    {/* Target Domains */}
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 mb-1.5">
                        Target Domains
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {profile.targetDomains.slice(0, 5).map((domain, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-900/50"
                          >
                            {domain}
                          </span>
                        ))}
                        {profile.targetDomains.length > 5 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            +{profile.targetDomains.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer / Resume link */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 truncate max-w-[65%]">
                      <span className="text-sm">📄</span>
                      <span className="truncate font-mono text-[11px]">{profile.resumeName}</span>
                    </div>

                    <a
                      href={`/api/profiles/${profile.id}/resume`}
                      target="_blank"
                      rel="noreferrer"
                      download={profile.resumeName}
                      onClick={(e) => e.stopPropagation()}
                      className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline flex items-center gap-1"
                    >
                      <span>Download</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Candidate Profile Modal */}
        {isAdding && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden animate-fadeIn">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <div>
                  <h2 className="text-xl font-bold text-white">Add Candidate & Upload Resume</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Uploaded resumes are saved to the backend and ready for recruiter tailoring.
                  </p>
                </div>
                <button
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-white text-2xl font-light w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Candidate Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Job Profile / Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Job Category *
                    </label>
                    <select
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      value={formData.category}
                      onChange={handleCategoryChange}
                    >
                      <option value="">Select Domain...</option>
                      {Object.keys(CATEGORY_PRESETS).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Work Authorization
                    </label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      value={formData.workAuth}
                      onChange={(e) => setFormData({ ...formData, workAuth: e.target.value })}
                    >
                      <option value="H1B">H1B</option>
                      <option value="F-1 STEM OPT">F-1 STEM OPT</option>
                      <option value="US Citizen">US Citizen</option>
                      <option value="Green Card">Green Card</option>
                      <option value="Any">Any / Not Restrictive</option>
                    </select>
                  </div>
                </div>

                {/* Max Experience Years */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Experience Filter Limit: {formData.maxExperienceYears} Years
                    </label>
                    <span className="text-[11px] text-slate-500">Skips posts demanding more</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={formData.maxExperienceYears}
                    onChange={(e) => setFormData({ ...formData, maxExperienceYears: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-400 bg-slate-800"
                  />
                </div>

                {/* Target Domains */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Target Domains / Keywords (Comma separated)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm font-mono text-xs"
                    placeholder="Java, Spring Boot, AWS, Microservices"
                    value={formData.targetDomains}
                    onChange={(e) => setFormData({ ...formData, targetDomains: e.target.value })}
                  />
                </div>

                {/* Resume Upload Dropzone */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Resume Document (DOCX or PDF, Max 10MB) *
                  </label>
                  <div
                    onClick={() => document.getElementById('modal-resume-file')?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-950/50 group"
                  >
                    <input
                      id="modal-resume-file"
                      type="file"
                      hidden
                      accept=".docx,.pdf"
                      onChange={handleFileChange}
                    />
                    <div className="text-slate-400 group-hover:text-cyan-400 transition-colors">
                      <div className="text-3xl mb-2">📁</div>
                      <p className="text-xs font-semibold text-slate-200">
                        {formData.resume ? formData.resume.name : 'Click to select or drag and drop resume'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">Accepts .docx and .pdf files up to 10MB</p>
                    </div>

                    {formData.resume && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-lg text-xs font-mono">
                        <span>✓ {formData.resume.name} ({(formData.resume.size / 1024).toFixed(1)} KB)</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData({ ...formData, resume: null });
                          }}
                          className="hover:text-red-400 ml-1 text-sm font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Candidate Details Snippet */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Candidate Profile Summary & Contact Info (Used in Email Application)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs font-mono"
                    placeholder="Name: John Doe&#10;Email: candidate@example.com&#10;Phone: +1 (555) 000-0000&#10;Availability: Immediate"
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 rounded-xl hover:from-cyan-300 hover:to-teal-300 transition-all font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading to Backend...' : 'Save & Link Resume'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search Status Modal */}
        {searchModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-base font-bold text-white">Outreach Dispatch Session</h3>
                </div>
                <button
                  onClick={() => setSearchModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {searchStatusLog || 'Initializing...'}
                </pre>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSearchModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
