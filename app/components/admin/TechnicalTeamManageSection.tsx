"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supportApi } from "@/lib/supportApi";
import {
  IconBriefcase,
  IconDownload,
  IconFileSpreadsheet,
  IconLoader,
  IconMail,
  IconPhone,
  IconPlus,
  IconTrash,
  IconUpload,
  IconUserPlus,
} from "./AdminIcons";
import "./escalated-tickets.css";

const EMPTY_FORM = { name: "", designation: "", phone: "", email: "" };

const AVATAR_TONES = ["indigo", "violet", "blue", "emerald", "rose"];

function avatarTone(name = "") {
  return AVATAR_TONES[(name.charCodeAt(0) || 0) % AVATAR_TONES.length];
}

export function TechnicalTeamCard({
  member,
  onRemove,
  showRemove = false,
}: {
  member: any;
  onRemove?: (id: string, name: string) => void;
  showRemove?: boolean;
}) {
  const initial = (member.name || "?").charAt(0).toUpperCase();
  const tone = avatarTone(member.name);
  const designation = member.designation || member.specialty || "Specialist";
  const department = member.department || "Product Engineering";

  return (
    <article className={`hs-tech-card hs-tech-card--${tone}`}>
      {showRemove && onRemove ? (
        <button
          type="button"
          className="hs-tech-card__remove"
          title={`Remove ${member.name}`}
          onClick={() => onRemove(member.id, member.name)}
        >
          <IconTrash size={14} />
        </button>
      ) : null}
      <div className="hs-tech-card__header">
        <span className="hs-tech-card__avatar" aria-hidden>
          {initial}
        </span>
        <div className="hs-tech-card__identity">
          <h3 className="hs-tech-card__name">{member.name}</h3>
          <span className="hs-tech-card__role">{designation}</span>
        </div>
      </div>
      <p className="hs-tech-card__dept">
        <IconBriefcase size={13} />
        {department}
      </p>
      <div className="hs-tech-card__contacts">
        {member.email ? (
          <a href={`mailto:${member.email}`} className="hs-tech-card__contact">
            <IconMail size={14} />
            <span>{member.email}</span>
          </a>
        ) : (
          <span className="hs-tech-card__contact hs-tech-card__contact--muted">
            <IconMail size={14} />
            <span>—</span>
          </span>
        )}
        {member.phone ? (
          <a href={`tel:${member.phone}`} className="hs-tech-card__contact">
            <IconPhone size={14} />
            <span>{member.phone}</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function TechnicalTeamManageSection({ onMembersChanged }: { onMembersChanged?: () => void }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    supportApi
      .adminTechnicalTeamAll()
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setStatus("Could not load technical team"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeMembers = members.filter((m) => m.active !== false);

  const downloadTemplate = async () => {
    try {
      await supportApi.adminTechnicalTeamTemplate();
      setStatus("Template downloaded");
    } catch (err: any) {
      setStatus(err?.message || "Failed to download template");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.xlsx?$/i.test(file.name)) {
      setStatus("Upload .xlsx or .xls only");
      return;
    }
    setImporting(true);
    setStatus("");
    try {
      const data = await supportApi.adminImportTechnicalTeam(file);
      setStatus(data?.message || "Import complete");
      load();
      onMembersChanged?.();
    } catch (err: any) {
      setStatus(err?.message || "Import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setStatus("Name and email are required");
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      await supportApi.adminCreateTechnicalMember({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        designation: form.designation.trim() || undefined,
        department: "Product Engineering",
      });
      setForm(EMPTY_FORM);
      setStatus("Team member added");
      load();
      onMembersChanged?.();
    } catch (err: any) {
      setStatus(err?.message || "Failed to add member");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!window.confirm(`Remove ${name} from the technical team?`)) return;
    try {
      await supportApi.adminDeleteTechnicalMember(id);
      load();
      onMembersChanged?.();
      setStatus(`${name} removed`);
    } catch (err: any) {
      setStatus(err?.message || "Failed to remove member");
    }
  };

  return (
    <div className="hs-tech-manage">
      <div className="hs-tech-manage__import">
        <div className="hs-tech-manage__import-icon" aria-hidden>
          <IconFileSpreadsheet size={22} />
        </div>
        <div className="hs-tech-manage__import-text">
          <strong>Bulk import</strong>
          <p>Download the Excel template (Name, Designation, Mobile, Email) and import multiple members at once.</p>
        </div>
        <div className="hs-tech-manage__import-actions">
          <button type="button" className="hs-tech-manage__btn hs-tech-manage__btn--outline" onClick={() => void downloadTemplate()}>
            <IconDownload size={16} />
            Template
          </button>
          <label className={`hs-tech-manage__btn hs-tech-manage__btn--primary hs-tech-manage__upload${importing ? " is-busy" : ""}`}>
            {importing ? <IconLoader size={16} /> : <IconUpload size={16} />}
            Import Excel
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={(e) => void handleImport(e)}
              disabled={importing}
            />
          </label>
        </div>
      </div>

      <form className="hs-tech-manage__form" onSubmit={handleAdd}>
        <div className="hs-tech-manage__form-head">
          <IconUserPlus size={18} />
          <div>
            <h3>Add team member</h3>
            <p>New members receive email and SMS when assigned escalated tickets.</p>
          </div>
        </div>
        <div className="hs-tech-manage__fields">
          <label className="hs-tech-manage__field">
            <span>Name *</span>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" />
          </label>
          <label className="hs-tech-manage__field">
            <span>Designation</span>
            <input value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} placeholder="e.g. Product Engineer" />
          </label>
          <label className="hs-tech-manage__field">
            <span>Mobile number</span>
            <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" />
          </label>
          <label className="hs-tech-manage__field">
            <span>Email *</span>
            <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@company.com" />
          </label>
        </div>
        <div className="hs-tech-manage__form-actions">
          <button type="submit" className="hs-btn hs-btn--primary" disabled={saving}>
            <IconPlus size={16} />
            {saving ? "Adding…" : "Add member"}
          </button>
        </div>
      </form>

      {status ? <p className="admin-action-status">{status}</p> : null}

      <div className="hs-tech-manage__list-wrap">
        <h4 className="hs-tech-manage__list-title">
          CURRENT TEAM
          <span className="hs-tech-manage__list-count">{activeMembers.length} active</span>
        </h4>
        {loading ? (
          <p className="sx-help-muted">Loading team…</p>
        ) : !activeMembers.length ? (
          <p className="sx-help-muted">No team members yet — add someone above or import from Excel.</p>
        ) : (
          <ul className="hs-tech-manage__grid">
            {activeMembers.map((m) => (
              <li key={m.id}>
                <TechnicalTeamCard member={m} showRemove onRemove={handleRemove} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
