import { useEffect, useState } from "react";
import {
  Mail,
  LogOut,
  Plus,
  Search,
  Send,
  Clock3,
  Link2,
  Unlink2,
  Upload,
  X,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  Inbox,
  LoaderCircle,
  Menu,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, API } from "./api";
import type { EmailStats } from "./api";
import type { EmailJob, User } from "./types";

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(value))
    : "-";

function Login() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-5">
      <div className="w-full max-w-[390px] border border-gray-200 rounded-lg p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-11 w-11 rounded-xl bg-green-50 flex items-center justify-center">
            <Mail className="text-brand" size={21} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
          <p className="text-sm text-gray-500 mt-2">
            Sign in to manage your email schedules.
          </p>
        </div>
        <a
          href={`${API}/auth/google`}
          className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-md h-11 text-sm font-medium hover:bg-gray-50 transition"
        >
          <span className="font-bold">G</span>
          Continue with Google
        </a>
      </div>
    </div>
  );
}

function Header({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <header className="h-16 border-b border-gray-200 flex items-center justify-between px-7">
      <div className="flex items-center gap-2 font-semibold">
        <div className="h-8 w-8 rounded-lg bg-brand text-white flex items-center justify-center">
          <Mail size={17} />
        </div>
        ReachInbox
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-right">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>
        {user.avatar ? (
          <img src={user.avatar} className="h-9 w-9 rounded-full border" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold">
            {user.name.charAt(0)}
          </div>
        )}
        <button
          onClick={onLogout}
          className="text-gray-500 hover:text-gray-900"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

function StatusPill({ status }: { status: EmailJob["status"] }) {
  const cls =
    status === "SENT"
      ? "bg-green-50 text-green-700"
      : status === "FAILED"
        ? "bg-red-50 text-red-700"
        : status === "PROCESSING"
          ? "bg-blue-50 text-blue-700"
          : "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
      {status.toLowerCase()}
    </span>
  );
}

function EmailTable({
  emails,
  sent,
  onSelect,
  loading,
}: {
  emails: EmailJob[];
  sent?: boolean;
  onSelect?: (email: EmailJob) => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="border border-gray-200 rounded-xl py-20 text-center text-sm text-gray-500">
        <LoaderCircle className="mx-auto mb-3 spin" size={24} />
        Loading email activity...
      </div>
    );
  }
  if (!emails.length) {
    return (
      <div className="border border-dashed border-gray-300 rounded-xl py-20 text-center">
        {sent ? (
          <Send className="mx-auto text-gray-300" />
        ) : (
          <Clock3 className="mx-auto text-gray-300" />
        )}
        <p className="mt-3 text-sm font-medium">
          No {sent ? "sent" : "scheduled"} emails
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Your email activity will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left font-medium text-gray-500 px-5 py-3">
                Email
              </th>
              <th className="text-left font-medium text-gray-500 px-5 py-3">
                Subject
              </th>
              <th className="text-left font-medium text-gray-500 px-5 py-3">
                {sent ? "Sent time" : "Scheduled time"}
              </th>
              <th className="text-left font-medium text-gray-500 px-5 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {emails.map((email) => (
              <tr
                key={email.id}
                className="hover:bg-gray-50/70 cursor-pointer"
                onClick={() => onSelect?.(email)}
              >
                <td className="px-5 py-4 whitespace-nowrap">
                  {email.recipient}
                </td>
                <td className="px-5 py-4 max-w-[340px] truncate">
                  {email.subject}
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                  {new Date(
                    sent && email.sentAt ? email.sentAt : email.scheduledAt,
                  ).toLocaleString()}
                </td>
                <td className="px-5 py-4">
                  <StatusPill status={email.status} />
                  {email.previewUrl && (
                    <a
                      className="ml-2 text-xs text-brand underline"
                      href={email.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Preview
                    </a>
                  )}
                  {email.lastError && (
                    <div
                      className="text-xs text-red-600 mt-1 truncate max-w-[220px]"
                      title={email.lastError}
                    >
                      {email.lastError}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Compose({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientError, setRecipientError] = useState("");
  const [startAt, setStartAt] = useState("");
  const [delay, setDelay] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [loading, setLoading] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    try {
      const result = await api.parseCsv(file);
      setRecipients((current) => {
        const existing = new Set(current.map((email) => email.toLowerCase()));
        return [
          ...current,
          ...result.emails.filter(
            (email) => !existing.has(email.toLowerCase()),
          ),
        ];
      });
      toast.success(`${result.count} email addresses detected`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not parse file");
    }
  };

  const addRecipient = () => {
    const email = recipientInput.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRecipientError("Enter a valid email address.");
      return;
    }
    if (
      recipients.some(
        (recipient) => recipient.toLowerCase() === email.toLowerCase(),
      )
    ) {
      setRecipientError("That recipient is already added.");
      return;
    }
    setRecipients((current) => [...current, email]);
    setRecipientInput("");
    setRecipientError("");
  };

  const removeRecipient = (email: string) => {
    setRecipients((current) =>
      current.filter((recipient) => recipient !== email),
    );
    setRecipientError("");
  };

   const schedule = async () => {
    if (!subject || !body || !recipients.length || !startAt) {
      toast.error("Please complete subject, body, recipients and start time", {
        duration: 3500,
        position: "top-right",
      });
      return;
    }

    setLoading(true);

    try {
      await api.schedule({
        subject,
        body,
        recipients,
        startAt: new Date(startAt).toISOString(),
        delayMs: delay,
        hourlyLimit,
      });

      toast.success(
        `✓ ${recipients.length} ${
          recipients.length === 1 ? "email" : "emails"
        } scheduled successfully`,
        {
          duration: 4000,
          position: "top-right",
        },
      );

      await onDone();
      onClose();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Scheduling failed. Please try again.",
        {
          duration: 4500,
          position: "top-right",
        },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] overflow-auto rounded-xl border shadow-xl">
        <div className="h-14 px-5 border-b flex items-center justify-between">
          <div className="font-semibold">Compose New Email</div>
          <button onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="block text-gray-500 mb-1">Subject</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-10 border rounded-md px-3 outline-none focus:ring-2 focus:ring-green-100"
                placeholder="Your subject"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-500 mb-1">Lead file</span>
              <label className="h-10 border border-dashed rounded-md px-3 flex items-center gap-2 cursor-pointer hover:bg-gray-50">
                <Upload size={16} />
                <span>
                  {recipients.length
                    ? `${recipients.length} emails detected`
                    : "Upload CSV / TXT"}
                </span>
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => upload(e.target.files?.[0])}
                />
              </label>
            </label>
          </div>

          <div className="recipient-section">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>
                Recipients:{" "}
                <span className="font-medium text-gray-800">
                  {recipients.length}
                </span>
              </span>
              <span className="text-xs text-gray-400">
                Add one or more recipients
              </span>
            </div>
            <div className="recipient-input-row">
              <input
                value={recipientInput}
                onChange={(e) => {
                  setRecipientInput(e.target.value);
                  setRecipientError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRecipient();
                  }
                }}
                className="w-full h-10 border rounded-md px-3 outline-none focus:ring-2 focus:ring-green-100"
                placeholder="Enter recipient email..."
                type="email"
              />
              <button
                type="button"
                onClick={addRecipient}
                className="recipient-add-button"
              >
                Add
              </button>
            </div>
            {recipientError && (
              <p className="recipient-error">{recipientError}</p>
            )}
            {recipients.length > 0 && (
              <div className="recipient-chips">
                {recipients.map((email) => (
                  <span className="recipient-chip" key={email}>
                    {email}
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      aria-label={`Remove ${email}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="text-sm block">
            <span className="block text-gray-500 mb-1">Email body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full border rounded-md p-3 outline-none focus:ring-2 focus:ring-green-100 resize-y"
              placeholder="Write your email..."
            />
          </label>

          <div className="grid md:grid-cols-3 gap-4">
            <label className="text-sm">
              <span className="block text-gray-500 mb-1">Start time</span>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full h-10 border rounded-md px-3"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-500 mb-1">
                Delay between emails (ms)
              </span>
              <input
                type="number"
                min={0}
                value={delay}
                onChange={(e) => setDelay(Number(e.target.value))}
                className="w-full h-10 border rounded-md px-3"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-500 mb-1">Hourly limit</span>
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full h-10 border rounded-md px-3"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 h-10 border rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              disabled={loading}
              onClick={schedule}
              className="px-5 h-10 rounded-md bg-brand text-white text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Scheduling..." : "Schedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tab, setTab] = useState<"all" | "scheduled" | "sent" | "failed">(
    "all",
  );
  const [emails, setEmails] = useState<EmailJob[]>([]);
  const [search, setSearch] = useState("");
  const [compose, setCompose] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    scheduled: 0,
    sent: 0,
    failed: 0,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [scheduled, sent, nextStats] = await Promise.all([
        api.scheduled(),
        api.sent(),
        api.stats(),
      ]);
      const unique = new Map(
        [...scheduled, ...sent].map((email) => [email.id, email]),
      );
      setEmails(Array.from(unique.values()));
      setStats(nextStats);
    } catch (e) {
      if (e instanceof Error && e.message.includes("Authentication"))
        onLogout();
      else toast.error("Could not load emails");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    api
      .slackStatus()
      .then((x) => setSlackConnected(x.connected))
      .catch(() => {});
  }, []);

  const doSearch = async () => {
    if (!search.trim()) return load();
    try {
      setEmails(await api.search(search));
    } catch {
      toast.error("Search failed");
    }
  };

  const visibleEmails = emails.filter((email) => {
    if (tab === "scheduled")
      return email.status === "SCHEDULED" || email.status === "PROCESSING";
    if (tab === "sent") return email.status === "SENT";
    if (tab === "failed") return email.status === "FAILED";
    return true;
  });
  const sentCount = stats.sent;
  const scheduledCount = stats.scheduled;
  const failedCount = stats.failed;
  const chooseTab = (next: typeof tab) => {
    setTab(next);
    setMobileNav(false);
  };

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Mail size={17} />
          </div>
          <span>ReachInbox</span>
          <button className="mobile-close" onClick={() => setMobileNav(false)}>
            <X size={18} />
          </button>
        </div>
        <button onClick={() => setCompose(true)} className="compose-cta">
          <Plus size={16} /> Compose new email
        </button>
        <div className="side-label">WORKSPACE</div>
        <div className="side-nav">
          <button
            onClick={() => chooseTab("all")}
            className={tab === "all" ? "active" : ""}
          >
            <Inbox size={16} /> Overview
          </button>
          <button
            onClick={() => chooseTab("scheduled")}
            className={tab === "scheduled" ? "active" : ""}
          >
            <Clock3 size={16} /> Scheduled <b>{scheduledCount}</b>
          </button>
          <button
            onClick={() => chooseTab("sent")}
            className={tab === "sent" ? "active" : ""}
          >
            <Send size={16} /> Sent <b>{sentCount}</b>
          </button>
          <button
            onClick={() => chooseTab("failed")}
            className={tab === "failed" ? "active" : ""}
          >
            <AlertCircle size={16} /> Failed <b>{failedCount}</b>
          </button>
        </div>
        <div className="sidebar-integration">
          <div className="side-label">INTEGRATIONS</div>
          {slackConnected ? (
            <button
              onClick={async () => {
                await api.disconnectSlack();
                setSlackConnected(false);
                toast.success("Slack disconnected");
              }}
            >
              <span className="slack-badge">S</span> Slack connected{" "}
              <CheckCircle2 size={14} />
            </button>
          ) : (
            <a href={`${API}/auth/slack`}>
              <span className="slack-badge">S</span> Connect Slack{" "}
              <Link2 size={14} />
            </a>
          )}
        </div>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <button className="mobile-menu" onClick={() => setMobileNav(true)}>
            <Menu size={20} />
          </button>
          <div className="crumb">
            Workspace <ChevronDown size={14} />{" "}
            <strong>
              {tab === "all" ? "Overview" : tab[0].toUpperCase() + tab.slice(1)}
            </strong>
          </div>
          <div className="header-actions">
            <span className="healthy">
              <span /> All systems operational
            </span>
            <div className="user-chip">
              <div className="user-avatar">{user.name.charAt(0)}</div>
              <span>{user.name}</span>
            </div>
            <button className="logout-button" onClick={onLogout}>
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="dashboard-content">
          <div className="page-title">
            <div>
              <div className="eyebrow">EMAIL WORKSPACE</div>
              <h1>
                {tab === "all"
                  ? `Good work, ${user.name.split(" ")[0]}.`
                  : `${tab[0].toUpperCase() + tab.slice(1)} emails`}
              </h1>
              <p>
                {tab === "all"
                  ? "Here’s the pulse of your outbound communication."
                  : `Review and manage your ${tab} email activity.`}
              </p>
            </div>
            <button onClick={() => setCompose(true)} className="primary-action">
              <Plus size={17} /> Compose email
            </button>
          </div>
          <div className="summary-cards">
            <div>
              <div className="card-icon green">
                <Mail size={17} />
              </div>
              <span>Total emails</span>
              <strong>{stats.total}</strong>
              <small>All activity</small>
            </div>
            <div>
              <div className="card-icon amber">
                <Clock3 size={17} />
              </div>
              <span>Scheduled</span>
              <strong>{scheduledCount}</strong>
              <small>Waiting to send</small>
            </div>
            <div>
              <div className="card-icon blue">
                <Send size={17} />
              </div>
              <span>Sent</span>
              <strong>{sentCount}</strong>
              <small>Delivered via Ethereal</small>
            </div>
            <div>
              <div className="card-icon red">
                <AlertCircle size={17} />
              </div>
              <span>Failed</span>
              <strong>{failedCount}</strong>
              <small>{failedCount ? "Needs attention" : "All clear"}</small>
            </div>
          </div>
          <div className="activity-toolbar">
            <div className="activity-tabs">
              <button
                className={tab === "all" ? "active" : ""}
                onClick={() => chooseTab("all")}
              >
                All <span>{stats.total}</span>
              </button>
              <button
                className={tab === "scheduled" ? "active" : ""}
                onClick={() => chooseTab("scheduled")}
              >
                Scheduled <span>{scheduledCount}</span>
              </button>
              <button
                className={tab === "sent" ? "active" : ""}
                onClick={() => chooseTab("sent")}
              >
                Sent <span>{sentCount}</span>
              </button>
              <button
                className={tab === "failed" ? "active" : ""}
                onClick={() => chooseTab("failed")}
              >
                Failed <span>{failedCount}</span>
              </button>
            </div>
            <div className="search-field">
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="Search emails"
              />
              <button onClick={doSearch}>
                <Sparkles size={13} />
              </button>
            </div>
          </div>
          <EmailTable
            emails={visibleEmails}
            sent={tab === "sent"}
            loading={loading}
            onSelect={setSelectedEmail}
          />
        </main>
      </div>
      {selectedEmail && (
        <div className="details-overlay" onClick={() => setSelectedEmail(null)}>
          <div
            className="details-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="details-top">
              <div>
                <div className="eyebrow">EMAIL DETAILS</div>
                <h2>{selectedEmail.subject}</h2>
              </div>
              <button onClick={() => setSelectedEmail(null)}>
                <X size={18} />
              </button>
            </div>
            <StatusPill status={selectedEmail.status} />
            <div className="details-item">
              <label>RECIPIENT</label>
              <p>{selectedEmail.recipient}</p>
            </div>
            <div className="details-item">
              <label>MESSAGE</label>
              <p className="body-copy">{selectedEmail.body}</p>
            </div>
            {selectedEmail.lastError && (
              <div className="failure-detail">
                <AlertCircle size={16} />
                <span>
                  <strong>Delivery failed</strong>
                  {selectedEmail.lastError}
                </span>
              </div>
            )}
            {selectedEmail.previewUrl && (
              <a
                className="preview-action"
                href={selectedEmail.previewUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ArrowUpRight size={15} /> Open Ethereal preview
              </a>
            )}
            <div className="details-item">
              <label>
                {selectedEmail.status === "SENT" ? "SENT AT" : "SCHEDULED FOR"}
              </label>
              <p>
                {formatDate(
                  selectedEmail.status === "SENT"
                    ? selectedEmail.sentAt
                    : selectedEmail.scheduledAt,
                )}
              </p>
            </div>
          </div>
        </div>
      )}
      {compose && <Compose onClose={() => setCompose(false)} onDone={load} />}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = () => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  };

  useEffect(loadUser, []);

  if (loading)
    return (
      <div className="boot-screen">
        <LoaderCircle className="spin" size={22} /> Opening workspace...
      </div>
    );
  if (!user) return <Login />;

  return (
    <Dashboard
      user={user}
      onLogout={async () => {
        await api.logout();
        setUser(null);
      }}
    />
  );
}
