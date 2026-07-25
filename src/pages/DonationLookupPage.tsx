import { KeyboardEvent, useRef, useState } from "react";
import { FiCheckCircle, FiCreditCard, FiHash, FiLoader, FiSearch } from "react-icons/fi";
import { formatCurrency } from "../services/format";

type DonationRecord = {
  sourceSpreadsheetId: string;
  sourceSheet: string;
  fullname: string;
  modeOfTransfer: string;
  amount: string;
  dateOfTransfer: string;
  refNo: string;
};

type LookupResponse = {
  ok: boolean;
  message: string;
  records: DonationRecord[];
};

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export function DonationLookupPage() {
  const [donationCode, setDonationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<DonationRecord[]>([]);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  async function lookupDonation() {
    const code = donationCode.trim();
    if (!code) {
      setError("Please enter a donation code.");
      setRecords([]);
      return;
    }

    setLoading(true);
    setError("");
    setRecords([]);
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/api/lookup?code=${encodeURIComponent(code)}`, {
        signal: controller.signal
      });
      const contentType = response.headers.get("content-type") || "";
      const rawBody = await response.text();
      let data: LookupResponse;

      try {
        data = JSON.parse(rawBody) as LookupResponse;
      } catch {
        const isHtml = rawBody.trim().startsWith("<");
        const hint = isHtml
          ? "API returned HTML instead of JSON. Use Vercel dev locally or set VITE_API_BASE."
          : "API response is not valid JSON.";
        throw new Error(`${hint} (status ${response.status}, content-type: ${contentType || "unknown"})`);
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }
      if (requestId !== requestIdRef.current) return;
      if (!data.ok) {
        setError(data.message || "No donation found with this code.");
        return;
      }

      setRecords(data.records);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Request failed: ${message}`);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }

  function handleEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      void lookupDonation();
    }
  }

  return (
    <section className="page-shell lookup-page">
      <div className="page-panel page-hero-panel lookup-hero-panel">
        <div>
          <p className="eyebrow">Donation Lookup</p>
          <h1>Check your verified SBL donation details.</h1>
          <p className="page-lead">
            Enter the donation code shared with you to view matching contribution records from Solid Block Link&apos;s lookup source.
          </p>
        </div>
        <div className="lookup-status-card">
          <FiSearch aria-hidden="true" />
          <p>Integrated into the main SBL site</p>
          <span>Powered by the existing donation lookup API.</span>
        </div>
      </div>

      <section className="page-panel donation-lookup-panel">
        <div className="donation-lookup-form">
          <label htmlFor="donation-code">
            <span>Donation Code</span>
            <input
              id="donation-code"
              type="text"
              value={donationCode}
              onChange={(event) => setDonationCode(event.target.value)}
              onKeyDown={handleEnter}
              placeholder="Enter your donation code"
              autoComplete="off"
            />
          </label>
          <button className="lookup-button" type="button" onClick={() => void lookupDonation()} disabled={loading}>
            {loading ? <FiLoader aria-hidden="true" /> : <FiSearch aria-hidden="true" />}
            {loading ? "Checking..." : "Check Donation"}
          </button>
        </div>

        {loading ? <p className="lookup-notice">Checking donation records...</p> : null}
        {!loading && error ? <p className="lookup-error">{error}</p> : null}

        {!loading && records.length > 0 ? (
          <div className="lookup-results">
            <div className="lookup-result-head">
              <FiCheckCircle aria-hidden="true" />
              <div>
                <h2>Donation record found</h2>
                <p>{records.length} matching record{records.length === 1 ? "" : "s"} returned.</p>
              </div>
            </div>
            {records.map((record, index) => (
              <article className="lookup-result-card" key={`${record.sourceSpreadsheetId}-${record.sourceSheet}-${record.refNo}-${index}`}>
                <div>
                  <span>Name</span>
                  <strong>{record.fullname}</strong>
                </div>
                <div>
                  <span>Amount Donated</span>
                  <strong>{!Number.isNaN(Number(record.amount)) && Number(record.amount) > 0 ? formatCurrency(Number(record.amount)) : `PHP ${record.amount}`}</strong>
                </div>
                <div>
                  <span>Date of Transfer</span>
                  <strong>{record.dateOfTransfer}</strong>
                </div>
                <div>
                  <span>Mode of Transfer</span>
                  <strong><FiCreditCard aria-hidden="true" /> {record.modeOfTransfer}</strong>
                </div>
                <div>
                  <span>Reference No.</span>
                  <strong><FiHash aria-hidden="true" /> {record.refNo}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}
