import { useEffect, useRef, useState } from 'react';
import { api, type FeatureConfig } from './api';
import { helperLocale, helperT as t } from './i18n';
import './feature-simulation.css';
import { featureDemo } from './feature-demo';

type Simulation = Awaited<ReturnType<typeof api.testFeature>>;
export type SimulationDraft = {
  guildId: string;
  key: string;
  label: string;
  config: FeatureConfig;
  enabled: boolean;
};

// Mount only for the current guild/feature. Closing or navigating unmounts this
// component, aborts the read-only simulation and discards any late response.
export function FeatureSimulation({ draft, onClose }: {
  draft: SimulationDraft;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Simulation | null>(null);
  const [failed, setFailed] = useState(false);
  const [animationFailed, setAnimationFailed] = useState(false);
  const locale = helperLocale() === 'pt' ? 'pt' : 'en';
  const demo = featureDemo(draft.key, locale);
  const media = demo ? `${import.meta.env.BASE_URL}feature-demos/${demo.asset}` : '';

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.showModal();
    return () => {
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResult(null);
    setFailed(false);
    const timeout = window.setTimeout(() => {
      if (active) { setFailed(true); controller.abort(); }
    }, 20_000);
    void api.testFeature(draft.key, draft.config, { signal: controller.signal }).then(next => {
      if (!active || controller.signal.aborted) return;
      if (next.key !== draft.key || !next.result || !Array.isArray(next.result.issues) || !Array.isArray(next.result.effects)) {
        throw new Error('simulation_contract_mismatch');
      }
      setResult(next);
    }).catch(() => {
      if (active && !controller.signal.aborted) setFailed(true);
    }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [draft, attempt]);

  const errors = result?.result.issues.filter(issue => issue.severity === 'error') ?? [];
  return <dialog ref={dialog} className="feature-simulation" aria-labelledby="simulation-title"
    aria-describedby="simulation-safety" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="feature-simulation__header">
      <div><small className="eyebrow">{t('helper.demoEyebrow', 'SAFE DEMONSTRATION')}</small>
        <h2 id="simulation-title">{draft.label}</h2></div>
      <button type="button" className="secondary" autoFocus onClick={onClose}>{t('helper.demoClose', 'Close demonstration')}</button>
    </header>
    <p id="simulation-safety">{t('helper.demoSafety', 'This demonstration does not send messages or change your server. Editor changes are saved separately and automatically.')}</p>
    {demo && <section className="feature-simulation__example" aria-labelledby="simulation-example">
      <h3 id="simulation-example">{demo.title}</h3>
      <p>{demo.example}</p>
      <picture>
        <source media="(prefers-reduced-motion: reduce)" srcSet={`${media}.png`} type="image/png" />
        <img className="feature-simulation__animation" src={`${media}.gif`} alt={demo.title}
          aria-describedby="simulation-transcript" onError={() => setAnimationFailed(true)} />
      </picture>
      {animationFailed && <p role="alert">{t('helper.demoAnimationError', 'The animation could not load. You can still read the steps below and retry by reopening the demonstration.')}</p>}
      <div id="simulation-transcript" className="feature-simulation__steps">
        {demo.steps.map(step => <p key={step}>{step}</p>)}
      </div>
    </section>}
    <section className="feature-simulation__validation" aria-labelledby="simulation-validation" aria-busy={!result && !failed}>
      <h3 id="simulation-validation">{t('helper.demoValidation', 'Check of your current draft')}</h3>
      {!draft.enabled && <p>{t('helper.demoDisabled', 'This feature is disabled in the editor. The demonstration does not enable it.')}</p>}
      {failed ? <><p role="alert">{t('helper.demoCheckError', 'Could not validate the current draft with the API. The example animation is not a successful validation.')}</p>
        <button type="button" className="secondary" onClick={() => setAttempt(value => value + 1)}>{t('helper.demoRetry', 'Retry validation')}</button></>
        : !result ? <p role="status">{t('helper.demoChecking', 'Validating the current draft…')}</p>
        : <>
          <p role="status">{errors.length ? t('helper.demoInvalid', 'These settings need changes before the feature can run.')
            : result.result.would_apply ? t('helper.demoValid', 'The API validated these settings. The simulation did not send messages or change the server.')
            : t('helper.demoNoAction', 'The API simulation reports no action for this draft.')}</p>
          {result.result.issues.length > 0 && <ul>{result.result.issues.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>}
          <details><summary>{t('helper.demoTechnical', 'Technical simulation details')}</summary>
            <ul>{result.result.effects.map((effect, index) => <li key={index}>{effect}</li>)}</ul>
            {result.decision && <p>{result.decision.reason}</p>}
          </details>
        </>}
    </section>
  </dialog>;
}
