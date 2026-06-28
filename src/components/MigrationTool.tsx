/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppState } from "../types";
import { RefreshCcw, Table, FileSpreadsheet, ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";

interface MigrationToolProps {
  state: AppState;
  onRunMigration: () => Promise<any>;
}

export default function MigrationTool({ state, onRunMigration }: MigrationToolProps) {
  const [loading, setLoading] = useState(false);
  const [reportResult, setReportResult] = useState<any | null>(null);

  const handleMigrate = async () => {
    setLoading(true);
    setReportResult(null);
    try {
      const res = await onRunMigration();
      setReportResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
      
      {/* Overview */}
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          Legacy Google Sheets PMS Migration Tool
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Import historic booking CSV logs, verifying date constraints, checking double-bookings, mapping unique phones, and bulk-importing.
        </p>
      </div>

      {/* Steps Visual Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-mono font-bold">1</span>
            Columns Mapping
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Rooms sheet mapped to <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">roomId</code>, bookings mapped to dates, unique phones mapped to guest identifiers.
          </p>
        </div>

        <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-mono font-bold">2</span>
            Conflict Verification
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            The migration tool parses each date row in real-time, verifying overlap integrity against existing checked-in guests.
          </p>
        </div>

        <div className="p-4 bg-slate-50/50 rounded-lg border border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-mono font-bold">3</span>
            Rollback Transactions
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Double bookings and invalid email formats are automatically rejected with full reporting logs, while safe rows load cleanly.
          </p>
        </div>

      </div>

      {/* Run section */}
      <div className="p-5 bg-indigo-50/30 border border-indigo-100 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-indigo-950">Run Live Sheets CSV Import</p>
          <p className="text-[10px] text-slate-500 mt-1 max-w-lg">
            Runs a migration snapshot: Dwayne Johnson (safe, 101), Selena Gomez (safe, 102), Lionel Messi (safe, 201), Invalid Row (rejected due to empty contact info), Conflict Row (rejected due to overlap conflict with Dwayne Johnson).
          </p>
        </div>
        <button
          onClick={handleMigrate}
          disabled={loading}
          className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-400 transition-all cursor-pointer flex items-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> Verifying and Importing...
            </>
          ) : (
            <>
              <RefreshCcw className="w-3.5 h-3.5" /> Execute CSV Sheet Load
            </>
          )}
        </button>
      </div>

      {/* Reporting Log Board */}
      {reportResult && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-3 gap-3">
            
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
              <p className="text-lg font-black text-emerald-800">{reportResult.importCount}</p>
              <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Successfully Migrated</p>
            </div>

            <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-center">
              <p className="text-lg font-black text-red-800">{reportResult.conflictCount}</p>
              <p className="text-[10px] text-red-600 font-bold uppercase mt-1">Conflicts Rejected</p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-center">
              <p className="text-lg font-black text-amber-800">{reportResult.failCount}</p>
              <p className="text-[10px] text-amber-600 font-bold uppercase mt-1 font-mono">Format Invalid Rows</p>
            </div>

          </div>

          {/* Detailed logs */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
            <p className="text-xs font-bold text-slate-400 mb-2 font-mono">Terminal CSV Migration Logs:</p>
            <div className="space-y-1 font-mono text-[10px] max-h-48 overflow-y-auto">
              {reportResult.reports.map((log: string, idx: number) => {
                const isFail = log.includes("ignored") || log.includes("Conflict");
                return (
                  <p key={idx} className={isFail ? "text-red-400" : "text-emerald-400"}>
                    {isFail ? "⚠️ " : "✓ "} {log}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
