"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_TYPE_OPTIONS = [
  { value: "new",      label: "New User" },
  { value: "existing", label: "Existing User" },
];

const ACTION_OPTIONS = [
  { value: "visits",         label: "Visits" },
  { value: "does_not_visit", label: "Does Not Visit" },
];

const PAGE_MODE_OPTIONS = [
  { value: "dropdown", label: "Select page" },
  { value: "url",      label: "Enter URL" },
];

const URL_MATCH_OPTIONS = [
  { value: "exact",    label: "Exact URL" },
  { value: "contains", label: "URL contains" },
];

const FREQUENCY_OPTIONS = [
  { value: "every_time",       label: "Every time condition matches" },
  { value: "once_ever",        label: "Once ever per lead" },
  { value: "once_per_session", label: "Once per session" },
  { value: "x_per_session",    label: "Up to X times per session" },
  { value: "x_total",          label: "Up to X times total" },
];

const EMPTY_CONDITION = {
  action:          "visits",
  page_mode:       "dropdown",
  page_value:      "",
  page_match_type: "exact",
};

const EMPTY_FORM = {
  name:                "",
  user_type:           "existing",
  condition_operator:  "AND",
  conditions:          [{ ...EMPTY_CONDITION }],
  trigger_frequency:   "once_ever",
  trigger_limit:       1,
  is_enabled:          true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeCondition(c) {
  // Already new format
  if (c.action === "visits" || c.action === "does_not_visit") return c;
  // Convert old format (action: "visit" / page_match_type etc.)
  return {
    action:          "visits",
    page_mode:       c.page_match_type && c.page_match_type !== "any" ? "url" : "dropdown",
    page_value:      c.page_match_value || "",
    page_match_type: c.page_match_type === "contains" ? "contains" : "exact",
  };
}

function normalizeRule(rule) {
  const rawConditions =
    Array.isArray(rule.conditions) && rule.conditions.length > 0
      ? rule.conditions
      : [
          {
            action:          rule.action || "visit",
            page_match_type: rule.page_match_type || "any",
            page_match_value: rule.page_match_value || "",
          },
        ];

  return {
    ...rule,
    user_type:          rule.user_type || "existing",
    condition_operator: rule.condition_operator || "AND",
    conditions:         rawConditions.map(normalizeCondition),
    trigger_frequency:  rule.trigger_frequency || "once_ever",
    trigger_limit:      rule.trigger_limit ?? 1,
  };
}

function frequencyLabel(rule) {
  switch (rule.trigger_frequency) {
    case "every_time":       return "every time";
    case "once_per_session": return "once per session";
    case "once_ever":        return "once ever";
    case "x_per_session":    return `up to ${rule.trigger_limit}× per session`;
    case "x_total":          return `up to ${rule.trigger_limit}× total`;
    default:                 return rule.trigger_frequency;
  }
}

function conditionText(cond, knownPages) {
  const actionLabel = cond.action === "does_not_visit" ? "does not visit" : "visits";
  let pageLabel = "any page";
  if (cond.page_value) {
    if (cond.page_mode === "dropdown") {
      const found = knownPages.find((p) => p.url === cond.page_value);
      pageLabel = found?.title || cond.page_value;
    } else {
      pageLabel =
        cond.page_match_type === "contains"
          ? `URL contains "${cond.page_value}"`
          : cond.page_value;
    }
  }
  return { actionLabel, pageLabel };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
        enabled ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function RuleSummary({ rule, knownPages = [] }) {
  const n = normalizeRule(rule);
  const userLabel = USER_TYPE_OPTIONS.find((o) => o.value === n.user_type)?.label || n.user_type;
  const opLabel = n.condition_operator;

  return (
    <span className="text-gray-500 text-xs">
      If <span className="font-medium text-gray-700">{userLabel}</span>{" "}
      {n.conditions.map((cond, i) => {
        const { actionLabel, pageLabel } = conditionText(cond, knownPages);
        return (
          <span key={i}>
            {i > 0 && (
              <span
                className={`mx-1 font-bold text-xs px-1.5 py-0.5 rounded ${
                  opLabel === "OR"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {opLabel}
              </span>
            )}
            <span className="font-medium text-gray-700">{actionLabel}</span>{" "}
            <code className="bg-gray-100 px-1 py-0.5 rounded">{pageLabel}</code>
          </span>
        );
      })}
      {" → send email "}
      <span className="text-purple-600 font-medium">({frequencyLabel(n)})</span>
    </span>
  );
}

function ConditionRow({ condition, index, total, operator, knownPages, onChangeCondition, onChangeOperator, onRemove }) {
  const set = (key, val) => onChangeCondition(index, { ...condition, [key]: val });

  return (
    <div className="space-y-1.5">
      {/* AND / OR toggle between rows */}
      {index > 0 && (
        <div className="flex items-center gap-2 my-1">
          <div className="h-px flex-1 bg-gray-200" />
          <button
            onClick={() => onChangeOperator(operator === "AND" ? "OR" : "AND")}
            className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors cursor-pointer ${
              operator === "OR"
                ? "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200"
                : "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
            }`}
            title="Click to toggle AND / OR"
          >
            {operator}
          </button>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
        {/* IF label */}
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-4 shrink-0">
          {index === 0 ? "IF" : ""}
        </span>

        {/* Action: Visits / Does Not Visit */}
        <select
          value={condition.action}
          onChange={(e) => set("action", e.target.value)}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Page mode: select from dropdown or enter URL */}
        <select
          value={condition.page_mode}
          onChange={(e) => {
            onChangeCondition(index, { ...condition, page_mode: e.target.value, page_value: "" });
          }}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400"
        >
          {PAGE_MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Page value */}
        {condition.page_mode === "dropdown" ? (
          <select
            value={condition.page_value}
            onChange={(e) => set("page_value", e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400 max-w-xs"
          >
            <option value="">— Any page —</option>
            {knownPages.map((p) => (
              <option key={p.url} value={p.url} title={p.url}>
                {p.title && p.title !== p.url ? `${p.title} (${p.url})` : p.url}
              </option>
            ))}
          </select>
        ) : (
          <>
            <select
              value={condition.page_match_type}
              onChange={(e) => set("page_match_type", e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400"
            >
              {URL_MATCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder={condition.page_match_type === "exact" ? "/courses/python" : "/courses/"}
              value={condition.page_value}
              onChange={(e) => set("page_value", e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400 w-44"
            />
          </>
        )}

        {/* Remove button */}
        {total > 1 && (
          <button
            onClick={() => onRemove(index)}
            className="ml-auto text-gray-300 hover:text-red-400 text-xl leading-none font-bold transition-colors"
            title="Remove condition"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

function RuleForm({ initial = EMPTY_FORM, onSave, onCancel, saving, knownPages }) {
  const [form, setForm] = useState(() => normalizeRule(initial));

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const updateCondition = (index, updated) =>
    setForm((p) => {
      const conditions = [...p.conditions];
      conditions[index] = updated;
      return { ...p, conditions };
    });

  const addCondition = () =>
    setForm((p) => ({ ...p, conditions: [...p.conditions, { ...EMPTY_CONDITION }] }));

  const removeCondition = (index) =>
    setForm((p) => ({ ...p, conditions: p.conditions.filter((_, i) => i !== index) }));

  const needsLimit = ["x_per_session", "x_total"].includes(form.trigger_frequency);

  const isValid =
    form.name.trim() &&
    form.conditions.every(
      (c) =>
        c.page_mode === "dropdown" ||
        (c.page_mode === "url" && c.page_value.trim())
    );

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-5">

      {/* Rule name */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
          Rule Name
        </label>
        <input
          type="text"
          placeholder="e.g. Existing user revisits Python course"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* User Type — pill toggle */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
          User Type
        </label>
        <div className="flex gap-2">
          {USER_TYPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => set("user_type", o.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                form.user_type === o.value
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Conditions
          </label>
          {form.conditions.length > 1 && (
            <span className="text-xs text-gray-400">
              Click the{" "}
              <span
                className={`font-bold px-1.5 py-0.5 rounded ${
                  form.condition_operator === "OR"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {form.condition_operator}
              </span>{" "}
              badge to toggle
            </span>
          )}
        </div>

        <div className="space-y-1">
          {form.conditions.map((cond, i) => (
            <ConditionRow
              key={i}
              condition={cond}
              index={i}
              total={form.conditions.length}
              operator={form.condition_operator}
              knownPages={knownPages}
              onChangeCondition={updateCondition}
              onChangeOperator={(val) => set("condition_operator", val)}
              onRemove={removeCondition}
            />
          ))}
        </div>

        <button
          onClick={addCondition}
          className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <span className="text-base leading-none">+</span> Add Condition
        </button>
      </div>

      {/* Trigger frequency */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
          Trigger Frequency
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-400">Send email</span>
          <select
            value={form.trigger_frequency}
            onChange={(e) => set("trigger_frequency", e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400"
          >
            {FREQUENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {needsLimit && (
            <>
              <span className="text-sm text-gray-400">limit:</span>
              <input
                type="number"
                min={1}
                max={100}
                value={form.trigger_limit}
                onChange={(e) =>
                  set("trigger_limit", Math.max(1, Number(e.target.value) || 1))
                }
                className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400 w-20"
              />
              <span className="text-sm text-gray-400">
                time{form.trigger_limit !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5">
        <span className="text-xs text-gray-400 mr-2 uppercase font-semibold tracking-wide">
          Preview:
        </span>
        <RuleSummary rule={form} knownPages={knownPages} />
      </div>

      {/* Save / Cancel */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <Toggle enabled={form.is_enabled} onChange={(v) => set("is_enabled", v)} />
          <span className="text-sm text-gray-600">
            {form.is_enabled ? "Enabled" : "Disabled"}
          </span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !isValid}
            className="text-sm px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 font-medium"
          >
            {saving ? "Saving..." : "Save Rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailRulesPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [globalSaved, setGlobalSaved] = useState(false);
  const [rules, setRules] = useState([]);
  const [knownPages, setKnownPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const isAuth = sessionStorage.getItem("admin_authenticated");
    if (isAuth === "true") setAuthenticated(true);
    else router.push("/admin/login");
  }, [router]);

  useEffect(() => {
    if (!authenticated) return;
    Promise.all([
      fetch("/api/admin/email-settings?password=admin123").then((r) => r.json()),
      fetch("/api/admin/email-rules?password=admin123").then((r) => r.json()),
      fetch("/api/admin/known-pages?password=admin123").then((r) => r.json()),
    ]).then(([settingsRes, rulesRes, pagesRes]) => {
      if (settingsRes.settings) setGlobalEnabled(settingsRes.settings.global_enabled !== false);
      setRules((rulesRes.rules || []).map(normalizeRule));
      setKnownPages(pagesRes.pages || []);
    }).finally(() => setLoading(false));
  }, [authenticated]);

  const saveGlobal = async (value) => {
    setGlobalSaving(true);
    await fetch("/api/admin/email-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "admin123", global_enabled: value }),
    });
    setGlobalEnabled(value);
    setGlobalSaving(false);
    setGlobalSaved(true);
    setTimeout(() => setGlobalSaved(false), 2000);
  };

  const buildPayload = (form) => {
    const first = form.conditions[0] || EMPTY_CONDITION;
    return {
      password:            "admin123",
      name:                form.name,
      is_enabled:          form.is_enabled,
      user_type:           form.user_type,
      condition_operator:  form.condition_operator,
      conditions:          form.conditions,
      trigger_frequency:   form.trigger_frequency,
      trigger_limit:       form.trigger_limit,
      // flat backward-compat columns from first condition
      action:          first.action,
      page_match_type: first.page_mode === "url" ? first.page_match_type : "any",
      page_match_value: first.page_mode === "url" ? first.page_value : "",
    };
  };

  const createRule = async (form) => {
    setFormSaving(true);
    const res = await fetch("/api/admin/email-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(form)),
    });
    const data = await res.json();
    if (data.rule) setRules((prev) => [normalizeRule(data.rule), ...prev]);
    setFormSaving(false);
    setShowForm(false);
  };

  const updateRule = async (id, fields) => {
    const payload = fields.conditions ? buildPayload(fields) : { password: "admin123", ...fields };
    const res = await fetch(`/api/admin/email-rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.rule) setRules((prev) => prev.map((r) => (r.id === id ? normalizeRule(data.rule) : r)));
    setEditingRule(null);
    setFormSaving(false);
  };

  const deleteRule = async (id) => {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/admin/email-rules/${id}?password=admin123`, { method: "DELETE" });
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Email Rules</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Define conditions that trigger autonomous emails
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Dashboard</Link>
            <Link href="/admin/leads" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">All Leads</Link>
            <Link href="/admin/emails" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Email Log</Link>
            <Link href="/admin/settings" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Settings</Link>
            <button
              onClick={() => { sessionStorage.removeItem("admin_authenticated"); router.push("/admin/login"); }}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
        ) : (
          <>
            {/* Global toggle */}
            <div className={`rounded-xl border-2 p-5 flex items-center justify-between transition-colors ${globalEnabled ? "bg-white border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-gray-900">Email Automation</h2>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${globalEnabled ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                    {globalEnabled ? "ON" : "OFF"}
                  </span>
                  {globalSaved && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {globalEnabled
                    ? `${rules.filter((r) => r.is_enabled).length} active rule(s) running`
                    : "All autonomous emails paused"}
                </p>
              </div>
              <Toggle enabled={globalEnabled} onChange={(v) => { if (!globalSaving) saveGlobal(v); }} />
            </div>

            {/* Rules list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">
                  Rules{" "}
                  <span className="text-gray-400 font-normal text-sm">({rules.length})</span>
                </h3>
                {!showForm && !editingRule && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-1.5 text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    <span className="text-lg leading-none">+</span> Add Rule
                  </button>
                )}
              </div>

              {showForm && (
                <RuleForm
                  knownPages={knownPages}
                  onSave={createRule}
                  onCancel={() => setShowForm(false)}
                  saving={formSaving}
                />
              )}

              {rules.length === 0 && !showForm ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
                  <div className="text-3xl mb-3">📋</div>
                  <div className="text-gray-500 text-sm font-medium">No rules yet</div>
                  <div className="text-gray-400 text-xs mt-1">
                    Click "Add Rule" to define your first email trigger condition
                  </div>
                </div>
              ) : (
                rules.map((rule) => (
                  <div key={rule.id}>
                    {editingRule === rule.id ? (
                      <RuleForm
                        initial={rule}
                        knownPages={knownPages}
                        onSave={(form) => { setFormSaving(true); updateRule(rule.id, form); }}
                        onCancel={() => setEditingRule(null)}
                        saving={formSaving}
                      />
                    ) : (
                      <div className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-4 transition-colors ${!rule.is_enabled || !globalEnabled ? "opacity-60" : "border-gray-200"}`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${rule.is_enabled && globalEnabled ? "bg-green-500" : "bg-gray-300"}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-gray-900">{rule.name}</span>
                              {rule.conditions.length > 1 && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${rule.condition_operator === "OR" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                                  {rule.conditions.length} conditions · {rule.condition_operator}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5">
                              <RuleSummary rule={rule} knownPages={knownPages} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Toggle
                            enabled={rule.is_enabled}
                            onChange={(v) => updateRule(rule.id, { is_enabled: v })}
                          />
                          <button
                            onClick={() => setEditingRule(rule.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <p className="text-xs text-gray-400 text-center">
              AND = all conditions must match · OR = any condition triggers · Global OFF pauses all rules
            </p>
          </>
        )}
      </div>
    </div>
  );
}
