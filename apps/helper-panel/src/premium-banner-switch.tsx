import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { helperT as t } from './i18n';
import { activationChoice, type PremiumSeatStatus } from './premium-activation';
import './premium-activation.css';

export function PremiumBannerSwitch({ guildId, guildName, premium, checked, onChange, onActivated }: {
  guildId: string; guildName: string; premium: boolean; checked: boolean;
  onChange: (value: boolean) => void; onActivated: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PremiumSeatStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; }; }, []);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else { dialog.current?.close(); }
  }, [open]);
  function close() {
    if (inFlight.current) return;
    generation.current++;
    setOpen(false);
    trigger.current?.focus();
  }
  async function load() {
    const request = ++generation.current;
    setError(false); setStatus(null);
    try {
      const next = await api.premiumServer();
      if (mounted.current && request === generation.current) setStatus(next);
    } catch { if (mounted.current && request === generation.current) setError(true); }
  }
  async function activate() {
    if (inFlight.current || !status) return;
    inFlight.current = true; setBusy(true); setError(false);
    try {
      const result = await api.activatePremiumServer(guildId);
      if (!result.guild_premium) throw new Error('premium_not_active');
      if (!mounted.current) return;
      await onActivated();
      if (!mounted.current) return;
      onChange(true); setOpen(false); trigger.current?.focus();
    } catch {
      if (mounted.current) { setError(true); setStatus(null); }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const choice = status ? activationChoice(status) : null;
  return <>
    <label className="switch-row">
      <span>{t('helper.enableLevelBanner', 'Show the banner in the level-up message')}{!premium && ' · 🔒 Premium'}</span>
      <input ref={trigger} type="checkbox" checked={checked} aria-haspopup={!premium ? 'dialog' : undefined} onChange={event => {
        if (premium || !event.target.checked) onChange(event.target.checked);
        else { setOpen(true); void load(); }
      }} />
    </label>
    <dialog ref={dialog} className="premium-activation-dialog" aria-labelledby="premium-activation-title" onCancel={event => { event.preventDefault(); close(); }}>
      <h2 id="premium-activation-title">{t('helper.premiumActivateTitle', 'Activate Premium on this server?')}</h2>
      <p className="premium-activation-server">{guildName}</p>
      {error ? <p role="alert">{t('helper.premiumActivateError', 'Could not confirm Premium. Check again before retrying; no extra seat is used if this server is already active.')}</p>
        : !status ? <p role="status">{t('helper.premiumChecking', 'Checking your subscription…')}</p>
        : choice === 'plans' ? <p>{t('helper.premiumNoPass', 'You do not have an active Premium subscription. Would you like to see the plans? This does not start a purchase.')}</p>
        : choice === 'full' ? <p>{t('helper.premiumNoSeats', 'All your Premium server slots are in use. Manage your servers or change your plan.')}</p>
        : choice === 'active' ? <p>{t('helper.premiumAlreadyActive', 'This server already has Premium. Enable banners without using another slot?')}</p>
        : <p>{t('helper.premiumUseSeat', 'Use one slot from your subscription to activate Premium on this server?')}</p>}
      {status?.pass_active && <p>{t('helper.premiumSeatsUsed', 'Slots used')}: <strong>{status.used} / {status.seats}</strong></p>}
      <div className="premium-activation-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={close}>{t('helper.premiumCancel', 'No, cancel')}</button>
        {error && <button type="button" className="button primary" onClick={() => void load()}>{t('helper.premiumCheckAgain', 'Check again')}</button>}
        {!error && choice === 'plans' && <a className="button primary" href="/premium#plans">{t('helper.premiumSeePlans', 'Yes, view plans')}</a>}
        {!error && choice === 'full' && <a className="button primary" href="/account/">{t('helper.premiumManage', 'Manage subscription')}</a>}
        {!error && (choice === 'activate' || choice === 'active') && <button type="button" className="button primary" disabled={busy} onClick={() => void activate()}>{busy ? t('helper.premiumActivating', 'Activating…') : t('helper.premiumConfirm', 'Yes, activate')}</button>}
      </div>
    </dialog>
  </>;
}
