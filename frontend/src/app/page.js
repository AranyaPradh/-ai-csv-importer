"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { confirmImport, previewImport } from "../lib/api";
import { CRM_FIELDS } from "../constants/crmFields";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const getColumns = (rows) => {
  const columns = [];
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!columns.includes(key)) columns.push(key);
    });
  });
  return columns;
};

const DataTable = ({ columns, rows, emptyMessage, compact = false }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const rowHeight = compact ? 38 : 44;
  const viewportHeight = compact ? 310 : 430;
  const shouldVirtualize = rows.length > 50;
  const startIndex = shouldVirtualize
    ? Math.max(0, Math.floor(scrollTop / rowHeight) - 6)
    : 0;
  const visibleCount = shouldVirtualize
    ? Math.ceil(viewportHeight / rowHeight) + 12
    : rows.length;
  const visibleRows = shouldVirtualize
    ? rows.slice(startIndex, startIndex + visibleCount)
    : rows;
  const gridTemplateColumns = `repeat(${columns.length || 1}, minmax(160px, 1fr))`;

  if (!shouldVirtualize) {
    return (
      <div className={`table-shell ${compact ? "compact-table" : ""}`}>
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row._id || row.rowIndex || "row"}`}>
                  {columns.map((column) => (
                    <td key={column}>
                      {column === "created_at"
                        ? formatDate(row[column])
                        : String(row[column] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-cell" colSpan={columns.length || 1}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      className={`table-shell virtual-shell ${compact ? "compact-table" : ""}`}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="virtual-table" style={{ minWidth: Math.max(columns.length * 160, 760) }}>
        <div className="virtual-header" style={{ gridTemplateColumns }}>
          {columns.map((column) => (
            <div key={column}>{column}</div>
          ))}
        </div>
        <div className="virtual-body" style={{ height: rows.length * rowHeight }}>
          {visibleRows.map((row, index) => {
            const rowIndex = startIndex + index;

            return (
              <div
                className="virtual-row"
                key={`${rowIndex}-${row._id || row.rowIndex || "row"}`}
                style={{
                  gridTemplateColumns,
                  height: rowHeight,
                  transform: `translateY(${rowIndex * rowHeight}px)`,
                }}
              >
                {columns.map((column) => (
                  <div key={column}>
                    {column === "created_at"
                      ? formatDate(row[column])
                      : String(row[column] ?? "")}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("light");
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("csv-importer-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("csv-importer-theme", theme);
  }, [theme]);

  const previewColumns = useMemo(
    () =>
      preview?.columns?.length
        ? preview.columns
        : getColumns(preview?.rows || []),
    [preview]
  );

  const skippedRows = useMemo(
    () =>
      (result?.skippedRecords || []).map((record) => ({
        rowIndex: record.rowIndex,
        reason: record.reason,
        rawRow: JSON.stringify(record.rawRow || {}),
      })),
    [result]
  );

  const resetImport = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
  };

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      resetImport();
      setError("Please upload a valid .csv file.");
      return;
    }

    setFile(selectedFile);
    setPreview(null);
    setResult(null);
    setError("");
    setIsPreviewing(true);

    try {
      const data = await previewImport(selectedFile);
      setPreview(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) return;

    setError("");
    setResult(null);
    setIsImporting(true);

    try {
      const data = await confirmImport(file);
      setResult(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <main className="page" data-theme={theme}>
      <section className="import-card">
        <div className="modal-header">
          <div>
            <h1>Import Leads via CSV</h1>
            <p>Upload a CSV file to bulk import leads into your system.</p>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={resetImport}
            aria-label="Clear import"
          >
            X
          </button>
        </div>

        {!file ? (
          <div
            className={`upload-box ${isDragging ? "is-dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleFile(event.dataTransfer.files?.[0]);
            }}
          >
            <input
              ref={inputRef}
              className="file-input"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <button
              className="upload-icon"
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label="Choose CSV file"
            >
              ↑
            </button>
            <strong>Drop your CSV file here</strong>
            <p>or click to browse files</p>
            <span>Supported file: .csv</span>
            <small>
              Required headers: created_at, name, email, country_code,
              mobile_without_country_code, company, city, state, country,
              lead_owner, crm_status, crm_note. AI can map flexible columns.
            </small>
            <button className="sample-button" type="button">
              Download Sample CSV Template
            </button>
          </div>
        ) : (
          <div className="preview-state">
            <div className="file-row">
              <div className="file-icon">CSV</div>
              <div>
                <strong>{file.name}</strong>
                <span>{Math.max(file.size / 1024, 0.1).toFixed(2)} KB</span>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setResult(null);
                  setError("");
                }}
                aria-label="Remove file"
              >
                X
              </button>
            </div>

            {isPreviewing ? (
              <div className="loading-panel">Parsing CSV preview...</div>
            ) : null}

            {preview ? (
              <DataTable
                columns={previewColumns}
                rows={preview.rows || []}
                emptyMessage="No rows found in this CSV."
                compact
              />
            ) : null}
          </div>
        )}

        {error ? <div className="alert">{error}</div> : null}

        {isImporting ? (
          <div className="loading-panel">
            AI is extracting CRM fields. This may take a few seconds.
          </div>
        ) : null}

        <div className="actions">
          <button className="secondary-button" type="button" onClick={resetImport}>
            Cancel
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={!preview || isImporting}
            onClick={handleConfirm}
          >
            {isImporting ? "Processing..." : "Upload File"}
          </button>
        </div>

        <button
          className="theme-toggle"
          type="button"
          onClick={() =>
            setTheme((currentTheme) =>
              currentTheme === "dark" ? "light" : "dark"
            )
          }
          aria-pressed={theme === "dark"}
        >
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
      </section>

      {result ? (
        <section className="results-area">
          <div className="summary-grid">
            <div className="metric">
              <span>Total Imported</span>
              <strong>{result.totalImported}</strong>
            </div>
            <div className="metric">
              <span>Total Skipped</span>
              <strong>{result.totalSkipped}</strong>
            </div>
            <div className="metric">
              <span>Total Rows</span>
              <strong>{result.totalRows}</strong>
            </div>
          </div>

          <section className="result-panel">
            <h2>Parsed CRM Records</h2>
            <DataTable
              columns={CRM_FIELDS}
              rows={result.records || []}
              emptyMessage="No CRM records imported."
            />
          </section>

          {result.skippedRecords?.length ? (
            <section className="result-panel">
              <h2>Skipped Records</h2>
              <DataTable
                columns={["rowIndex", "reason", "rawRow"]}
                rows={skippedRows}
                emptyMessage="No skipped records."
                compact
              />
            </section>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}


