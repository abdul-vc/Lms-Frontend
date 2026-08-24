import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useMemo } from 'react';
import { authFetch, useAuth, API_BASE } from '@/lib/auth';
import { Link } from '@tanstack/react-router';
import {
  CheckSquare, Search, Filter, RotateCcw, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Eye, X, BookOpen, Layers, Building2, Shield,
  User as UserIcon, Calendar, Award, AlertCircle, Loader2, FileText, ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/org-admin/assessment-activity')({
  component: OrgAdminAssessmentActivityPage,
});

interface AssessmentRow {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  department_id: number | null;
  department_name: string | null;
  role_id: number | null;
  role_name: string | null;
  course_id: number;
  course_name: string;
  module_id: number | null;
  module_name: string;
  lesson_id: number;
  lesson_name: string;
  assessment_name: string;
  assessment_type: string;
  attempt_number: number;
  total_attempts: number;
  started_at: string | null;
  submitted_at: string | null;
  score: string;
  score_percent: number | null;
  percentage: string;
  result: string;
  status: string;
  questions_attempted: number;
  correct_answers: number;
  wrong_answers: number;
  auto_submitted: boolean;
}

interface QuestionDetail {
  question_number: number;
  question_id: number;
  question_text: string;
  options: { key: string; text: string }[];
  user_answer: string | null;
  user_answer_text: string;
  correct_option: string;
  correct_option_text: string;
  is_correct: boolean;
  explanation: string;
}

interface AttemptDetail extends AssessmentRow {
  questions: QuestionDetail[];
}

interface FilterOptions {
  courses: { id: number; title: string }[];
  modules: { id: number; title: string; course_id: number }[];
  lessons: { id: number; title: string; module_id: number; module__course_id: number }[];
  departments: { id: number; name: string }[];
  roles: { id: number; name: string }[];
  users: { id: number; name: string; email: string }[];
}

function OrgAdminAssessmentActivityPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    courses: [],
    modules: [],
    lessons: [],
    departments: [],
    roles: [],
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedResult, setSelectedResult] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ordering, setOrdering] = useState('-started_at');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Modal State
  const [selectedAttemptId, setSelectedAttemptId] = useState<number | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<AttemptDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Cascading modules and lessons based on selection
  const availableModules = useMemo(() => {
    if (!selectedCourse) return filterOptions.modules;
    return filterOptions.modules.filter((m) => String(m.course_id) === selectedCourse);
  }, [selectedCourse, filterOptions.modules]);

  const availableLessons = useMemo(() => {
    if (selectedModule) {
      return filterOptions.lessons.filter((l) => String(l.module_id) === selectedModule);
    }
    if (selectedCourse) {
      return filterOptions.lessons.filter((l) => String(l.module__course_id) === selectedCourse);
    }
    return filterOptions.lessons;
  }, [selectedCourse, selectedModule, filterOptions.lessons]);

  const fetchActivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (selectedCourse) params.set('course_id', selectedCourse);
      if (selectedModule) params.set('module_id', selectedModule);
      if (selectedLesson) params.set('lesson_id', selectedLesson);
      if (selectedDept) params.set('department_id', selectedDept);
      if (selectedRole) params.set('role_id', selectedRole);
      if (selectedUser) params.set('user_id', selectedUser);
      if (selectedResult) params.set('result', selectedResult);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (ordering) params.set('ordering', ordering);

      const url = `${API_BASE}/org-admin/assessment-activity/?${params.toString()}`;
      const res = await authFetch(url);
      if (!res.ok) {
        throw new Error('Failed to load assessment activity.');
      }
      const data = await res.json();
      setRows(data.results || []);
      if (data.filter_options) {
        setFilterOptions(data.filter_options);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [
    selectedCourse,
    selectedModule,
    selectedLesson,
    selectedDept,
    selectedRole,
    selectedUser,
    selectedResult,
    dateFrom,
    dateTo,
    ordering,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchActivity();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCourse('');
    setSelectedModule('');
    setSelectedLesson('');
    setSelectedDept('');
    setSelectedRole('');
    setSelectedUser('');
    setSelectedResult('');
    setDateFrom('');
    setDateTo('');
    setOrdering('-started_at');
    setCurrentPage(1);
  };

  const handleOpenDetail = async (attemptId: number) => {
    setSelectedAttemptId(attemptId);
    setAttemptDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await authFetch(`${API_BASE}/org-admin/assessment-activity/${attemptId}/`);
      if (!res.ok) {
        throw new Error('Failed to load assessment attempt details.');
      }
      const data = await res.json();
      setAttemptDetail(data);
    } catch (err: any) {
      console.error(err);
      setDetailError(err.message || 'Failed to load attempt details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedAttemptId(null);
    setAttemptDetail(null);
  };

  const toggleSort = (field: string) => {
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else if (ordering === `-${field}`) {
      setOrdering(field);
    } else {
      setOrdering(`-${field}`);
    }
    setCurrentPage(1);
  };

  // Pagination slice
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return '-';
    try {
      return format(new Date(ts), 'MMM d, yyyy h:mm a');
    } catch {
      return ts;
    }
  };

  const formatDuration = (startTs: string | null, endTs: string | null) => {
    if (!startTs || !endTs) return '-';
    try {
      const start = new Date(startTs).getTime();
      const end = new Date(endTs).getTime();
      const diffSec = Math.max(0, Math.floor((end - start) / 1000));
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      if (mins === 0) return `${secs}s`;
      return `${mins}m ${secs}s`;
    } catch {
      return '-';
    }
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
      selectedCourse ||
      selectedModule ||
      selectedLesson ||
      selectedDept ||
      selectedRole ||
      selectedUser ||
      selectedResult ||
      dateFrom ||
      dateTo
  );

  // Organization-level Access Control Guard
  const isFeatureEnabled =
    user?.is_platform_super_admin ||
    !user?.organization?.enabled_features ||
    user.organization.enabled_features.includes('assessment_activity');

  if (!isFeatureEnabled) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center">
          <Shield className="size-7" />
        </div>
        <div className="max-w-md">
          <h2 className="text-xl font-bold text-foreground mb-1">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">
            The Assessment Activity module is currently disabled for your organization by platform administration.
          </p>
        </div>
        <Link to="/org-admin" className="btn btn-secondary text-sm">
          Return to Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2 mb-1">
            <CheckSquare className="size-7 text-brand shrink-0" />
            Assessment Activity
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Review and analyze lesson assessment attempts and performance across your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCurrentPage(1);
              fetchActivity();
            }}
            disabled={loading}
            className="btn btn-secondary flex items-center gap-2 text-sm"
            title="Refresh assessment activity"
          >
            <RotateCcw className={cn("size-4", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        {/* Search row */}
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user name, email, course, lesson..."
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary px-5 text-sm shrink-0">
            Search
          </button>
        </form>

        {/* Multi-Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 border-t border-border/60">
          {/* Course Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedModule('');
                setSelectedLesson('');
                setCurrentPage(1);
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All Courses</option>
              {filterOptions.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Module</label>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setSelectedLesson('');
                setCurrentPage(1);
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All Modules</option>
              {availableModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Lesson</label>
            <select
              value={selectedLesson}
              onChange={(e) => {
                setSelectedLesson(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All Lessons</option>
              {availableLessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All Departments</option>
              {filterOptions.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All Roles</option>
              {filterOptions.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">User</label>
            <select
              value={selectedUser}
              onChange={(e) => {
                setSelectedUser(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All Users</option>
              {filterOptions.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Result Filter */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Result</label>
            <select
              value={selectedResult}
              onChange={(e) => {
                setSelectedResult(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All Results</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>

          {/* Date Range: From / To */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        </div>

        {/* Active Filters Clear Button */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
            <span className="text-muted-foreground">
              Filtered results: <strong className="text-foreground">{rows.length}</strong> attempts found
            </span>
            <button
              onClick={handleClearFilters}
              className="text-xs text-brand hover:underline font-semibold flex items-center gap-1"
            >
              <RotateCcw className="size-3" />
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden space-y-4">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th
                  onClick={() => toggleSort('user')}
                  className="px-4 py-3.5 cursor-pointer hover:text-foreground select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>User & Email</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th className="px-4 py-3.5">Department & Role</th>
                <th
                  onClick={() => toggleSort('course')}
                  className="px-4 py-3.5 cursor-pointer hover:text-foreground select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Course / Module / Lesson</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th className="px-4 py-3.5">Assessment</th>
                <th className="px-4 py-3.5 text-center">Attempt #</th>
                <th
                  onClick={() => toggleSort('started_at')}
                  className="px-4 py-3.5 cursor-pointer hover:text-foreground select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Start / Submit Time</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('score_percent')}
                  className="px-4 py-3.5 text-center cursor-pointer hover:text-foreground select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Score & %</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center">Result</th>
                <th className="px-4 py-3.5 text-center">Questions</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="size-6 animate-spin text-brand" />
                      <span>Loading assessment attempts...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckSquare className="size-8 text-muted-foreground/50" />
                      <p className="font-semibold text-foreground">No assessment activity recorded</p>
                      <p className="text-xs text-muted-foreground">
                        {hasActiveFilters
                          ? 'Try changing or resetting your search and filter criteria.'
                          : 'Learners have not completed any lesson assessments in this organization yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                    {/* 1. User Name & Email */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground">{row.user_name}</p>
                        <p className="text-[11px] text-muted-foreground">{row.user_email}</p>
                      </div>
                    </td>

                    {/* 2. Department & Role */}
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-foreground">{row.department_name || '-'}</span>
                        <p className="text-[11px] text-muted-foreground">{row.role_name || '-'}</p>
                      </div>
                    </td>

                    {/* 3. Course / Module / Lesson */}
                    <td className="px-4 py-3 max-w-[220px] truncate">
                      <div>
                        <p className="font-semibold text-foreground truncate" title={row.course_name}>
                          {row.course_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate" title={`${row.module_name} › ${row.lesson_name}`}>
                          {row.module_name} › <span className="text-foreground/80 font-medium">{row.lesson_name}</span>
                        </p>
                      </div>
                    </td>

                    {/* 4. Assessment Name */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-foreground">
                        <FileText className="size-3 text-muted-foreground" />
                        {row.assessment_type}
                      </span>
                    </td>

                    {/* 5. Attempt Number & Total */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand/10 text-brand">
                        Attempt {row.attempt_number} of {row.total_attempts}
                      </span>
                    </td>

                    {/* 6. Start / Submit Time */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-foreground">{formatTimestamp(row.started_at)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.submitted_at ? formatTimestamp(row.submitted_at) : <span className="text-amber-500 font-medium italic">In Progress</span>}
                        </p>
                      </div>
                    </td>

                    {/* 7. Score & % */}
                    <td className="px-4 py-3 text-center">
                      {row.submitted_at ? (
                        <div>
                          <p className="font-bold text-foreground">{row.score}</p>
                          <p className="text-[11px] text-muted-foreground font-semibold">{row.percentage}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* 8. Result */}
                    <td className="px-4 py-3 text-center">
                      {row.result === 'Passed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="size-3" />
                          Passed
                        </span>
                      )}
                      {row.result === 'Failed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <XCircle className="size-3" />
                          Failed
                        </span>
                      )}
                      {row.result === 'In Progress' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Clock className="size-3" />
                          In Progress
                        </span>
                      )}
                    </td>

                    {/* 9. Questions (Attempted / Correct / Wrong) */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-[11px]">
                        <span title="Total Questions" className="font-medium text-foreground">
                          {row.questions_attempted} Qs
                        </span>
                        <span className="text-muted-foreground/60">|</span>
                        <span title="Correct" className="font-bold text-emerald-600 dark:text-emerald-400">
                          {row.correct_answers} ✓
                        </span>
                        <span className="text-muted-foreground/60">|</span>
                        <span title="Wrong" className="font-bold text-rose-600 dark:text-rose-400">
                          {row.wrong_answers} ✗
                        </span>
                      </div>
                    </td>

                    {/* 10. Actions */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenDetail(row.id)}
                        className="btn btn-secondary px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Eye className="size-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Stacked Cards) */}
        <div className="block lg:hidden divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin mx-auto mb-2 text-brand" />
              <span>Loading assessment attempts...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckSquare className="size-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="font-semibold text-foreground">No assessment activity recorded</p>
            </div>
          ) : (
            paginatedRows.map((row) => (
              <div key={row.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{row.user_name}</h3>
                    <p className="text-xs text-muted-foreground">{row.user_email}</p>
                  </div>
                  {row.result === 'Passed' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="size-3" />
                      Passed
                    </span>
                  )}
                  {row.result === 'Failed' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      <XCircle className="size-3" />
                      Failed
                    </span>
                  )}
                  {row.result === 'In Progress' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Clock className="size-3" />
                      In Progress
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-xl">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Department / Role</span>
                    <span className="font-medium text-foreground">
                      {row.department_name || '-'} ({row.role_name || '-'})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Attempt</span>
                    <span className="font-bold text-brand">
                      Attempt {row.attempt_number} of {row.total_attempts}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[10px]">Course / Lesson</span>
                    <span className="font-semibold text-foreground">
                      {row.course_name} › {row.lesson_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Score</span>
                    <span className="font-bold text-foreground">
                      {row.score} ({row.percentage})
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Questions</span>
                    <span className="text-foreground">
                      <strong className="text-emerald-600">{row.correct_answers}✓</strong> /{' '}
                      <strong className="text-rose-600">{row.wrong_answers}✗</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">{formatTimestamp(row.started_at)}</span>
                  <button
                    onClick={() => handleOpenDetail(row.id)}
                    className="btn btn-secondary px-3 py-1 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Eye className="size-3.5" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Standard Pagination Controls */}
        {rows.length > 0 && (
          <div className="p-4 border-t border-border">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={rows.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        )}
      </div>

      {/* Attempt Detail Modal */}
      {selectedAttemptId !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-brand/10 text-brand grid place-items-center">
                  <CheckSquare className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground">Assessment Attempt Details</h2>
                  <p className="text-xs text-muted-foreground">
                    Complete attempt breakdown and question review
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseDetail}
                className="size-8 rounded-lg hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {detailLoading ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Loader2 className="size-8 animate-spin mx-auto mb-2 text-brand" />
                  <span>Loading attempt details...</span>
                </div>
              ) : detailError ? (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {detailError}
                </div>
              ) : attemptDetail ? (
                <>
                  {/* Summary Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                      <span className="text-[11px] font-semibold text-muted-foreground block">Learner</span>
                      <p className="font-bold text-foreground text-sm">{attemptDetail.user_name}</p>
                      <p className="text-xs text-muted-foreground">{attemptDetail.user_email}</p>
                    </div>

                    <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                      <span className="text-[11px] font-semibold text-muted-foreground block">Department & Role</span>
                      <p className="font-bold text-foreground text-sm">{attemptDetail.department_name || '-'}</p>
                      <p className="text-xs text-muted-foreground">{attemptDetail.role_name || '-'}</p>
                    </div>

                    <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                      <span className="text-[11px] font-semibold text-muted-foreground block">Attempt Number</span>
                      <p className="font-bold text-brand text-sm">
                        Attempt {attemptDetail.attempt_number} of {attemptDetail.total_attempts}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {attemptDetail.auto_submitted ? 'Auto-submitted (timer)' : 'Manual submission'}
                      </p>
                    </div>

                    <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                      <span className="text-[11px] font-semibold text-muted-foreground block">Course & Lesson</span>
                      <p className="font-bold text-foreground text-sm truncate" title={attemptDetail.course_name}>
                        {attemptDetail.course_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate" title={`${attemptDetail.module_name} › ${attemptDetail.lesson_name}`}>
                        {attemptDetail.module_name} › {attemptDetail.lesson_name}
                      </p>
                    </div>

                    <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                      <span className="text-[11px] font-semibold text-muted-foreground block">Time & Duration</span>
                      <p className="font-bold text-foreground text-sm">{formatTimestamp(attemptDetail.started_at)}</p>
                      <p className="text-xs text-muted-foreground">
                        Duration: {formatDuration(attemptDetail.started_at, attemptDetail.submitted_at)}
                      </p>
                    </div>

                    <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                      <span className="text-[11px] font-semibold text-muted-foreground block">Score & Result</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-black text-base text-foreground">
                          {attemptDetail.score} ({attemptDetail.percentage})
                        </span>
                        {attemptDetail.result === 'Passed' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Passed
                          </span>
                        )}
                        {attemptDetail.result === 'Failed' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            Failed
                          </span>
                        )}
                        {attemptDetail.result === 'In Progress' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Question Review Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                        <FileText className="size-4 text-brand" />
                        Question Breakdown ({attemptDetail.questions?.length || 0} Questions)
                      </h3>
                      <div className="text-xs flex items-center gap-3">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓ Correct: {attemptDetail.correct_answers}
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          ✗ Wrong: {attemptDetail.wrong_answers}
                        </span>
                      </div>
                    </div>

                    {attemptDetail.questions && attemptDetail.questions.length > 0 ? (
                      <div className="space-y-3">
                        {attemptDetail.questions.map((q) => (
                          <div
                            key={q.question_id}
                            className={cn(
                              "p-4 rounded-xl border transition-colors space-y-3",
                              q.is_correct
                                ? "bg-emerald-500/[0.03] border-emerald-500/30"
                                : "bg-rose-500/[0.03] border-rose-500/30"
                            )}
                          >
                            {/* Question Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2">
                                <span
                                  className={cn(
                                    "size-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5",
                                    q.is_correct
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                  )}
                                >
                                  {q.question_number}
                                </span>
                                <p className="font-semibold text-sm text-foreground">{q.question_text}</p>
                              </div>
                              <span
                                className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 inline-flex items-center gap-1",
                                  q.is_correct
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                )}
                              >
                                {q.is_correct ? (
                                  <>
                                    <CheckCircle2 className="size-3" />
                                    Correct
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="size-3" />
                                    Incorrect
                                  </>
                                )}
                              </span>
                            </div>

                            {/* Options List */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                              {q.options.map((opt) => {
                                const isUserChoice = q.user_answer === opt.key;
                                const isCorrectChoice = q.correct_option === opt.key;

                                return (
                                  <div
                                    key={opt.key}
                                    className={cn(
                                      "p-2.5 rounded-lg border text-xs flex items-center gap-2",
                                      isUserChoice && isCorrectChoice
                                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold"
                                        : isUserChoice && !isCorrectChoice
                                        ? "bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 font-semibold"
                                        : isCorrectChoice
                                        ? "bg-emerald-500/10 border-dashed border-emerald-500 text-emerald-600 dark:text-emerald-400 font-medium"
                                        : "bg-background/60 border-border/80 text-muted-foreground"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "size-5 rounded font-bold text-[10px] flex items-center justify-center shrink-0",
                                        isUserChoice && isCorrectChoice
                                          ? "bg-emerald-600 text-white"
                                          : isUserChoice && !isCorrectChoice
                                          ? "bg-rose-600 text-white"
                                          : isCorrectChoice
                                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                          : "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      {opt.key}
                                    </span>
                                    <span className="flex-1 truncate" title={opt.text}>
                                      {opt.text}
                                    </span>
                                    {isUserChoice && (
                                      <span className="text-[10px] uppercase font-bold shrink-0">
                                        (Your Answer)
                                      </span>
                                    )}
                                    {!isUserChoice && isCorrectChoice && (
                                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                        (Correct Answer)
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation */}
                            {q.explanation && (
                              <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground">
                                <strong className="text-foreground font-semibold block mb-0.5">Explanation:</strong>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-muted-foreground bg-muted/20 rounded-xl border border-border text-xs">
                        No question-level data recorded for this attempt.
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-border bg-muted/20 flex justify-end shrink-0">
              <button onClick={handleCloseDetail} className="btn btn-secondary text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
