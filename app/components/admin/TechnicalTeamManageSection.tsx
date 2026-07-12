"use client";

import { useCallback, useEffect, useState } from "react";
import { supportApi } from "@/lib/supportApi";
import { IconMail, IconPhone, IconPlus, IconTrash, IconUser } from "./AdminIcons";

const EMPTY_FORM = { name: "", designation: "", phone: "", email: "" };

const AVATAR_TONES = ["indigo", "violet", "blue", "emerald", "rose"];

function avatarTone(name = "") {
  return AVATAR_TONES[name.charCodeAt(0) % AVATAR_TONES.length];
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

  return (
    <article className={`hs-tech-card hs-tech-card--${tone}`}>
      {showRemove && onRemove ? (
        <button type="button" className="hs-tech-card__remove" title={`Remove ${member.name}`} onClick={() => onRemove(member.id, member.name)}>
          <IconTrash size={14} />
        </button>
      ) : null}
      <div className="hs-tech-card__header">
        <span className="hs-tech-card__avatar" aria-hidden>{initial}</span>
        <div className="hs-tech-card__identity">
          <h3 className="hs-tech-card__name">{member.name}</h3>
          <span className="hs-tech-card__role">{designation}</span>
        </div>
      </div>
      <p className="hs-tech-card__dept">{member.department || "Technical Support"}</p>
      <div className="hs-tech-card__contacts">
        {member.email ? (
          <a href={`mailto:${member.email}`} className="hs-tech-card__contact">
            <IconMail size={14} />
            <span>{member.email}</span>
          </a>
        ) : null}
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
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    supportApi.adminTechnicalTeamAll()
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setStatus("Could not load technical team"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeMembers = members.filter((m) => m.active !== false);

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
    } catch (err: any) {
      setStatus(err?.message || "Failed to remove member");
    }
  };

  return (
    <div className="hs-tech-manage">
      <form className="hs-tech-manage__form" onSubmit={handleAdd}>
        <div className="hs-tech-manage__form-head">
          <IconUser size={20} />
          <div>
            <h3>Add technical team member</h3>
            <p>Specialists receive email and SMS when a ticket is assigned to them.</p>
          </div>
        </div>
        <div className="hs-tech-manage__fields">
          <label className="hs-tech-manage__field"><span>Name *</span><input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" /></label>
          <label className="hs-tech-manage__field"><span>Email *</span><input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="specialist@company.com" /></label>
          <label className="hs-tech-manage__field"><span>Phone</span><input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91…" /></label>
          <label className="hs-tech-manage__field"><span>Designation</span><input value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} placeholder="e.g. Senior Engineer" /></label>
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
          Current team
          <span className="hs-tech-manage__list-count">{activeMembers.length}</span>
        </h4>
        {loading ? <p className="sx-help-muted">Loading team…</p> : !activeMembers.length ? (
          <p className="sx-help-muted">No team members yet — add someone above.</p>
        ) : (
          <ul className="hs-tech-manage__grid">
            {activeMembers.map((m) => (
              <li key={m.id}><TechnicalTeamCard member={m} showRemove onRemove={handleRemove} /></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
