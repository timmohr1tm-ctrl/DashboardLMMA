let DATA = null;
    const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
    const number = new Intl.NumberFormat("de-DE");
    const pct = new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 });
    const compactNumber = new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 });
    const compactEuro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 });
    const ratioNumber = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function money(value, compact = false) {
      return compact ? compactEuro.format(value || 0) : euro.format(value || 0);
    }

    function amount(value, compact = false) {
      return compact ? compactNumber.format(value || 0) : number.format(value || 0);
    }

    function ratio(value) {
      return value == null || !Number.isFinite(Number(value)) ? "n/a" : ratioNumber.format(value);
    }

    function cls(value) {
      if (value > 0) return "positive";
      if (value < 0) return "negative";
      return "neutral";
    }

    function currentRange() {
      return {
        start: document.getElementById("startDate").value,
        end: document.getElementById("endDate").value
      };
    }

    function filterLmRows() {
      const range = currentRange();
      return DATA.lm.rawRows.filter(row => (!range.start || row.date >= range.start) && (!range.end || row.date <= range.end));
    }

    function filterOtpRows() {
      const range = currentRange();
      return DATA.otp.rows.filter(row => (!range.start || row.date >= range.start) && (!range.end || row.date <= range.end));
    }

    function filterMarketDailyRows() {
      const range = currentRange();
      return DATA.lm.revenueContext.combinedDaily.filter(row => (!range.start || row.date >= range.start) && (!range.end || row.date <= range.end));
    }

    function filterInactiveLocationRows() {
      const range = currentRange();
      return (DATA.inactiveLocations?.monthlySeries || []).filter(row => (!range.start || row.date >= range.start) && (!range.end || row.date <= range.end));
    }

    function formatMonthLabel(monthKey) {
      const [year, mm] = monthKey.split("-");
      const names = { "01":"Jan", "02":"Feb", "03":"Mar", "04":"Apr", "05":"May", "06":"Jun", "07":"Jul", "08":"Aug", "09":"Sep", "10":"Oct", "11":"Nov", "12":"Dec" };
      return `${names[mm]} ${year.slice(2)}`;
    }

    function normalizeCommandText(value) {
      return (value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ß/g, "ss");
    }

    function monthEnd(monthKey) {
      const [year, month] = monthKey.split("-");
      const date = new Date(Number(year), Number(month), 0);
      return `${year}-${month}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function parseMonthMentions(query) {
      const normalized = normalizeCommandText(query);
      const monthMap = {
        januar: "01", jan: "01", january: "01",
        februar: "02", feb: "02", february: "02",
        marz: "03", maerz: "03", mar: "03", march: "03",
        april: "04", apr: "04",
        mai: "05", may: "05",
        juni: "06", jun: "06", june: "06",
        juli: "07", jul: "07", july: "07",
        august: "08", aug: "08",
        september: "09", sep: "09", sept: "09",
        oktober: "10", okt: "10", october: "10", oct: "10",
        november: "11", nov: "11",
        dezember: "12", dez: "12", december: "12", dec: "12"
      };
      const monthNames = Object.keys(monthMap).sort((a, b) => b.length - a.length).join("|");
      const monthPattern = new RegExp("\\b(" + monthNames + ")\\.?\\s*(20\\d{2}|\\d{2})\\b", "g");
      const numericPattern = /\b(0?[1-9]|1[0-2])[./-](20\d{2}|\d{2})\b/g;
      const mentions = [];
      let match;

      while ((match = monthPattern.exec(normalized)) !== null) {
        const month = monthMap[match[1]];
        const year = match[2].length === 2 ? `20${match[2]}` : match[2];
        mentions.push(`${year}-${month}`);
      }
      while ((match = numericPattern.exec(normalized)) !== null) {
        const month = String(Number(match[1])).padStart(2, "0");
        const year = match[2].length === 2 ? `20${match[2]}` : match[2];
        mentions.push(`${year}-${month}`);
      }
      return Array.from(new Set(mentions));
    }

    function parseYearToken(value) {
      return value.length === 2 ? `20${value}` : value;
    }

    function formatDateLabel(dateText) {
      const [year, month, day] = dateText.split("-");
      return `${day}.${month}.${year}`;
    }

    function formatShortDateLabel(dateText) {
      const [year, month, day] = dateText.split("-");
      return `${day}.${month}.${year.slice(2)}`;
    }

    function createMonthPeriod(monthKey) {
      return {
        key: monthKey,
        kind: "month",
        label: formatMonthLabel(monthKey),
        start: `${monthKey}-01`,
        end: monthEnd(monthKey)
      };
    }

    function createQuarterPeriod(year, quarter) {
      const startMonth = String((quarter - 1) * 3 + 1).padStart(2, "0");
      const endMonth = String(quarter * 3).padStart(2, "0");
      const endMonthKey = `${year}-${endMonth}`;
      return {
        key: `${year}-Q${quarter}`,
        kind: "quarter",
        label: `Q${quarter} ${String(year).slice(2)}`,
        start: `${year}-${startMonth}-01`,
        end: monthEnd(endMonthKey)
      };
    }

    function parseQuarterMentions(query) {
      const normalized = normalizeCommandText(query).replace(/\s+/g, " ");
      const aliases = [
        { quarter: 1, pattern: "q1|first quarter|frist quarter|1st quarter|1\. quarter|1\. quartal|erstes quartal|erster quartal|erstesquartal|quartal 1" },
        { quarter: 2, pattern: "q2|second quarter|2nd quarter|2\. quarter|2\. quartal|zweites quartal|zweiter quartal|zweitesquartal|quartal 2" },
        { quarter: 3, pattern: "q3|third quarter|3rd quarter|3\. quarter|3\. quartal|drittes quartal|dritter quartal|drittesquartal|quartal 3" },
        { quarter: 4, pattern: "q4|fourth quarter|4th quarter|4\. quarter|4\. quartal|viertes quartal|vierter quartal|viertesquartal|quartal 4" }
      ];
      const matches = [];
      aliases.forEach(item => {
        const before = new RegExp("\\b(?:" + item.pattern + ")\\s*/?\\s*(20\\d{2}|\\d{2})\\b", "g");
        const after = new RegExp("\\b(20\\d{2}|\\d{2})\\s*/?\\s*(?:" + item.pattern + ")\\b", "g");
        let match;
        while ((match = before.exec(normalized)) !== null) {
          matches.push({ index: match.index, period: createQuarterPeriod(parseYearToken(match[1]), item.quarter) });
        }
        while ((match = after.exec(normalized)) !== null) {
          matches.push({ index: match.index, period: createQuarterPeriod(parseYearToken(match[1]), item.quarter) });
        }
      });
      return matches
        .sort((a, b) => a.index - b.index)
        .map(item => item.period)
        .filter((period, index, list) => list.findIndex(candidate => candidate.key === period.key) === index);
    }

    function parseYearMentions(query) {
      const normalized = normalizeCommandText(query);
      const matches = Array.from(normalized.matchAll(/\b(20\d{2}|\d{2})\b/g))
        .map(match => parseYearToken(match[1]))
        .filter(year => Number(year) >= 2024 && Number(year) <= 2035);
      const years = Array.from(new Set(matches));
      if (years.length < 1) return [];
      const currentMaxDate = DATA.lm.maxDate;
      const currentMaxYear = currentMaxDate.slice(0, 4);
      const alignToCurrentYtd = years.includes(currentMaxYear);
      const monthDayCutoff = currentMaxDate.slice(4);
      return years.map(year => {
        const end = alignToCurrentYtd ? `${year}${monthDayCutoff}` : `${year}-12-31`;
        return {
          key: year,
          kind: alignToCurrentYtd ? "year-to-date" : "year",
          label: alignToCurrentYtd ? `${year} YTD through ${formatDateLabel(end).slice(0, 5)}` : year,
          start: `${year}-01-01`,
          end
        };
      });
    }

    function parseExecutivePeriods(query) {
      const quarters = parseQuarterMentions(query);
      if (quarters.length) return quarters;
      const months = parseMonthMentions(query).map(createMonthPeriod);
      if (months.length) return months;
      return parseYearMentions(query);
    }

    function monthKeyInRange(monthKey, start, end) {
      return monthEnd(monthKey) >= start && `${monthKey}-01` <= end;
    }

    function dateInRange(dateText, start, end) {
      return dateText >= start && dateText <= end;
    }

    function dayCountInclusive(start, end) {
      const startDate = new Date(`${start}T00:00:00`);
      const endDate = new Date(`${end}T00:00:00`);
      return Math.max(Math.round((endDate - startDate) / 86400000) + 1, 0);
    }

    function otpMonthSummary(monthKey) {
      const [year, month] = monthKey.split("-");
      const currentYearRow = DATA.otp.rows.find(row => row.monthKey === monthKey);
      if (currentYearRow) {
        return {
          revenue: currentYearRow.expectedRevenue ?? currentYearRow.actual2026 ?? null,
          target: currentYearRow.target2026 ?? null,
          gap: currentYearRow.gapToTarget ?? null,
          bookings: currentYearRow.bookings ?? null,
          period: currentYearRow.period
        };
      }

      const bridgeRow = DATA.otp.rows.find(row => String(row.monthNumber).padStart(2, "0") === month);
      if (year === "2025" && bridgeRow) {
        return {
          revenue: bridgeRow.actual2025 ?? null,
          target: null,
          gap: null,
          bookings: null,
          period: `${formatMonthLabel(monthKey)}`
        };
      }
      return { revenue: null, target: null, gap: null, bookings: null, period: formatMonthLabel(monthKey) };
    }

    function monthSummary(monthKey) {
      const lm = DATA.lm.monthlySeries.find(row => row.month === monthKey) || {};
      const listingRows = DATA.lm.revenueContext.activeListingsDaily.filter(row => row.date.startsWith(monthKey));
      const revenueRows = DATA.lm.revenueContext.dailyRows.filter(row => row.date.startsWith(monthKey));
      const inactiveRow = (DATA.inactiveLocations?.monthlySeries || []).find(row => row.month === monthKey);
      const avg = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
      const sumOrNull = values => values.length ? values.reduce((sum, value) => sum + value, 0) : null;
      const marketRevenue = sumOrNull(revenueRows.map(row => row.netRevenue || 0));
      const totalLeads = sumOrNull(revenueRows.map(row => row.totalLeads || 0));
      const netLeads = sumOrNull(revenueRows.map(row => row.netLeads || 0));
      const start = `${monthKey}-01`;
      const end = monthEnd(monthKey);
      const expectedDays = dayCountInclusive(start, end);
      return {
        monthKey,
        label: formatMonthLabel(monthKey),
        start,
        end,
        expectedDays,
        lmHandovers: lm.value ?? null,
        lmCancellations: lm.storno ?? null,
        lmRevenue: lm.revenueNet ?? null,
        lmPrice: lm.pricePerHandover ?? null,
        otp: otpMonthSummary(monthKey),
        avgListings: avg(listingRows.map(row => row.activeListings)),
        marketRevenue,
        avgDailyRevenue: avg(revenueRows.map(row => row.netRevenue || 0)),
        totalLeads,
        netLeads,
        avgDailyLeads: avg(revenueRows.map(row => row.netLeads || 0)),
        inactive: inactiveRow ? {
          activeLocations: inactiveRow.activeLocations,
          newlyInactive: inactiveRow.newlyInactive,
          newlyActivated: inactiveRow.newlyActivated,
          netChange: inactiveRow.netLocationChange,
          inactiveShare: inactiveRow.inactiveShare,
          monthCount: 1
        } : { activeLocations: null, newlyInactive: null, newlyActivated: null, netChange: null, inactiveShare: null, monthCount: 0 },
        listingDays: listingRows.length,
        revenueDays: revenueRows.length,
        listingComplete: listingRows.length >= expectedDays,
        revenueComplete: revenueRows.length >= expectedDays
      };
    }

    function periodSummary(period) {
      if (period.kind === "month") return { ...monthSummary(period.key), ...period };

      const lmRows = DATA.lm.rawRows.filter(row => dateInRange(row.date, period.start, period.end));
      const lmMonths = DATA.lm.monthlySeries.filter(row => monthKeyInRange(row.month, period.start, period.end));
      const listingRows = DATA.lm.revenueContext.activeListingsDaily.filter(row => dateInRange(row.date, period.start, period.end));
      const revenueRows = DATA.lm.revenueContext.dailyRows.filter(row => dateInRange(row.date, period.start, period.end));
      const inactiveRows = (DATA.inactiveLocations?.monthlySeries || []).filter(row => monthKeyInRange(row.month, period.start, period.end));
      const expectedDays = dayCountInclusive(period.start, period.end);
      const avg = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
      const sumOrNull = values => values.length ? values.reduce((sum, value) => sum + value, 0) : null;
      const periodYear = period.start.slice(0, 4);
      const otpRows = DATA.otp.rows.filter(row => {
        const monthKey = `${periodYear}-${String(row.monthNumber).padStart(2, "0")}`;
        return monthKeyInRange(monthKey, period.start, period.end);
      });
      const otpRevenueValues = otpRows
        .map(row => periodYear === "2025" ? row.actual2025 : (row.expectedRevenue ?? row.actual2026))
        .filter(value => value != null);
      const otpTargetValues = periodYear === "2026" ? otpRows.map(row => row.target2026).filter(value => value != null) : [];
      const otpRevenue = sumOrNull(otpRevenueValues);
      const otpTarget = sumOrNull(otpTargetValues);
      const inactiveLatest = inactiveRows.length ? inactiveRows[inactiveRows.length - 1] : null;

      return {
        ...period,
        expectedDays,
        lmHandovers: lmRows.length,
        lmCancellations: sumOrNull(lmMonths.map(row => row.storno || 0)),
        lmRevenue: sumOrNull(lmMonths.map(row => row.revenueNet || 0)),
        lmPrice: null,
        otp: {
          revenue: otpRevenue,
          target: otpTarget,
          gap: otpTarget == null || otpRevenue == null ? null : otpRevenue - otpTarget,
          bookings: sumOrNull(otpRows.map(row => row.bookings || 0)),
          period: period.label
        },
        avgListings: avg(listingRows.map(row => row.activeListings)),
        marketRevenue: sumOrNull(revenueRows.map(row => row.netRevenue || 0)),
        avgDailyRevenue: avg(revenueRows.map(row => row.netRevenue || 0)),
        totalLeads: sumOrNull(revenueRows.map(row => row.totalLeads || 0)),
        netLeads: sumOrNull(revenueRows.map(row => row.netLeads || 0)),
        avgDailyLeads: avg(revenueRows.map(row => row.netLeads || 0)),
        inactive: {
          activeLocations: inactiveLatest ? inactiveLatest.activeLocations : null,
          avgActiveLocations: avg(inactiveRows.map(row => row.activeLocations || 0)),
          newlyInactive: sumOrNull(inactiveRows.map(row => row.newlyInactive || 0)),
          newlyActivated: sumOrNull(inactiveRows.map(row => row.newlyActivated || 0)),
          netChange: sumOrNull(inactiveRows.map(row => row.netLocationChange || 0)),
          inactiveShare: avg(inactiveRows.map(row => row.inactiveShare).filter(value => value != null)),
          monthCount: inactiveRows.length
        },
        listingDays: listingRows.length,
        revenueDays: revenueRows.length,
        listingComplete: listingRows.length >= expectedDays,
        revenueComplete: revenueRows.length >= expectedDays
      };
    }

    function valueCell(value, formatter) {
      return value == null ? "n/a" : formatter(value);
    }

    function signedDeltaCell(current, previous, formatter) {
      if (current == null || previous == null) return { text: "n/a", className: "neutral" };
      const diff = current - previous;
      const sign = diff >= 0 ? "+" : "-";
      const pctChange = previous ? diff / previous : null;
      const pctText = pctChange == null ? "" : ` (${pct.format(pctChange)})`;
      return { text: `${sign}${formatter(Math.abs(diff))}${pctText}`, className: cls(diff) };
    }

    function signedPointDeltaCell(current, previous) {
      if (current == null || previous == null) return { text: "n/a", className: "neutral" };
      const diff = current - previous;
      const sign = diff >= 0 ? "+" : "-";
      return { text: `${sign}${(Math.abs(diff) * 100).toFixed(1).replace(".", ",")} pp`, className: cls(-diff) };
    }

    function comparisonMetricRow(label, summaries, valueGetter, formatter) {
      const firstValue = valueGetter(summaries[0]);
      const lastValue = valueGetter(summaries[summaries.length - 1]);
      const delta = signedDeltaCell(lastValue, firstValue, formatter);
      const cells = summaries
        .map(item => `<td>${valueCell(valueGetter(item), formatter)}</td>`)
        .join("");
      return `
        <tr>
          <td>${label}</td>
          ${cells}
          <td class="${delta.className}">${delta.text}</td>
        </tr>
      `;
    }

    function comparisonPointMetricRow(label, summaries, valueGetter) {
      const firstValue = valueGetter(summaries[0]);
      const lastValue = valueGetter(summaries[summaries.length - 1]);
      const delta = signedPointDeltaCell(lastValue, firstValue);
      const cells = summaries
        .map(item => `<td>${valueCell(valueGetter(item), value => pct.format(value))}</td>`)
        .join("");
      return `
        <tr>
          <td>${label}</td>
          ${cells}
          <td class="${delta.className}">${delta.text}</td>
        </tr>
      `;
    }

    function coverageCell(value, formatter, complete, actualDays, expectedDays) {
      if (value == null) return "n/a";
      if (complete) return formatter(value);
      return `${formatter(value)} · partial (${number.format(actualDays)}/${number.format(expectedDays)} days)`;
    }

    function comparisonMetricRowWithCoverage(label, summaries, valueGetter, formatter) {
      const comparable = summaries.every(item => item.revenueComplete);
      const firstValue = valueGetter(summaries[0]);
      const lastValue = valueGetter(summaries[summaries.length - 1]);
      const delta = comparable
        ? signedDeltaCell(lastValue, firstValue, formatter)
        : { text: "n/a · incomplete coverage", className: "neutral" };
      const cells = summaries
        .map(item => `<td>${coverageCell(valueGetter(item), formatter, item.revenueComplete, item.revenueDays, item.expectedDays)}</td>`)
        .join("");
      return `
        <tr>
          <td>${label}</td>
          ${cells}
          <td class="${delta.className}">${delta.text}</td>
        </tr>
      `;
    }

    function renderExecutiveSearchResult(periods) {
      const result = document.getElementById("executiveSearchResult");
      const maxComparisonPeriods = 4;
      const selected = periods.slice(0, maxComparisonPeriods).map(periodSummary);
      if (!selected.length) {
        result.hidden = false;
        result.innerHTML = `<p class="note">I could not identify a valid period in the input. Try: "Compare March 2025 with March 2026", "2025 vs 2026", "Q1 25 vs Q1 26" or add up to four explicit periods.</p>`;
        return;
      }

      const sortedStart = selected.map(item => item.start).sort()[0];
      const sortedEnd = selected.map(item => item.end).sort().slice(-1)[0];
      document.getElementById("startDate").value = sortedStart;
      document.getElementById("endDate").value = sortedEnd;
      setSelectedMode("mom");
      setBudgetChartMode("mom");
      updateView();

      if (selected.length === 1) {
        const item = selected[0];
        result.hidden = false;
        result.innerHTML = `
          <h2 class="section-title">Search Result: ${item.label}</h2>
          <p class="section-subtitle">The dashboard range has been set to ${item.label} (${formatDateLabel(item.start)} to ${formatDateLabel(item.end)}). The cards below summarise all available data for this period.</p>
          <div class="compare-summary">
            <div class="compare-card"><span>LM Handovers</span><strong>${valueCell(item.lmHandovers, value => amount(value, true))}</strong></div>
            <div class="compare-card"><span>LM Net Revenue</span><strong>${valueCell(item.lmRevenue, value => money(value, true))}</strong></div>
            <div class="compare-card"><span>OTP Revenue</span><strong>${valueCell(item.otp.revenue, value => money(value, true))}</strong></div>
            <div class="compare-card"><span>Avg. Active Listings</span><strong>${valueCell(item.avgListings, value => amount(Math.round(value), true))}</strong></div>
            <div class="compare-card"><span>Net Leads</span><strong>${valueCell(item.netLeads, value => amount(value, true))}</strong></div>
            <div class="compare-card"><span>Inactive Location Share</span><strong>${valueCell(item.inactive?.inactiveShare, value => pct.format(value))}</strong></div>
            <div class="compare-card"><span>Net Location Change</span><strong>${valueCell(item.inactive?.netChange, value => amount(value, true))}</strong></div>
          </div>
        `;
        return;
      }

      const first = selected[0];
      const last = selected[selected.length - 1];
      const handoverDelta = signedDeltaCell(last.lmHandovers, first.lmHandovers, value => amount(value, true));
      const otpDelta = signedDeltaCell(last.otp.revenue, first.otp.revenue, value => money(value, true));
      const listingDelta = signedDeltaCell(last.avgListings, first.avgListings, value => amount(Math.round(value), true));
      const marketRevenueDelta = signedDeltaCell(last.avgDailyRevenue, first.avgDailyRevenue, value => money(value, true));
      const leadDelta = signedDeltaCell(last.avgDailyLeads, first.avgDailyLeads, value => amount(Math.round(value), true));
      const inactiveShareDelta = signedPointDeltaCell(last.inactive?.inactiveShare, first.inactive?.inactiveShare);
      const locationNetDelta = signedDeltaCell(last.inactive?.netChange, first.inactive?.netChange, value => amount(value, true));
      const rows = [
        comparisonMetricRow("LM Assist handovers", selected, item => item.lmHandovers, value => amount(value, false)),
        comparisonMetricRow("LM Assist cancellations", selected, item => item.lmCancellations, value => amount(value, false)),
        comparisonMetricRow("LM Assist net revenue", selected, item => item.lmRevenue, value => money(value, false)),
        comparisonMetricRow("OTP revenue", selected, item => item.otp.revenue, value => money(value, false)),
        comparisonMetricRow("OTP target gap", selected, item => item.otp.gap, value => money(value, false)),
        comparisonMetricRow("Avg. active listings", selected, item => item.avgListings, value => amount(Math.round(value), false)),
        comparisonMetricRowWithCoverage("Market net revenue", selected, item => item.marketRevenue, value => money(value, false)),
        comparisonMetricRow("Avg. daily net revenue", selected, item => item.avgDailyRevenue, value => money(value, false)),
        comparisonMetricRowWithCoverage("Total leads", selected, item => item.totalLeads, value => amount(value, false)),
        comparisonMetricRowWithCoverage("Net leads", selected, item => item.netLeads, value => amount(value, false)),
        comparisonMetricRow("Avg. daily net leads", selected, item => item.avgDailyLeads, value => amount(Math.round(value), false)),
        comparisonPointMetricRow("Inactive location share", selected, item => item.inactive?.inactiveShare),
        comparisonMetricRow("Active dealer locations", selected, item => item.inactive?.activeLocations, value => amount(value, false)),
        comparisonMetricRow("Newly inactive locations", selected, item => item.inactive?.newlyInactive, value => amount(value, false)),
        comparisonMetricRow("Newly activated locations", selected, item => item.inactive?.newlyActivated, value => amount(value, false)),
        comparisonMetricRow("Net location change", selected, item => item.inactive?.netChange, value => amount(value, false))
      ].join("");

      const listingNote = selected.every(item => item.listingDays)
        ? `Active-listing comparison uses ${selected.map(item => `${number.format(item.listingDays)} points in ${item.label}`).join(", ")}.`
        : "Active-listing comparison is shown as n/a where no listing history exists for one of the selected months.";
      const revenueNote = selected.every(item => item.revenueDays)
        ? `Revenue and lead comparison uses ${selected.map(item => `${number.format(item.revenueDays)} rows in ${item.label}`).join(", ")}.`
        : "Revenue and lead comparison is shown as n/a where no daily market revenue history exists for one of the selected months.";
      const coverageWarning = selected.every(item => item.revenueComplete)
        ? "Market revenue and lead totals cover the full selected periods."
        : "Market revenue and lead totals are not compared as full-period deltas when one period has incomplete daily coverage; use the average daily rows for directional comparison or provide the missing daily revenue history.";
      const comparisonWindowNote = selected.some(item => item.kind === "year-to-date")
        ? `Year comparison is aligned to the latest available LM Assist date: ${formatDateLabel(DATA.lm.maxDate)}.`
        : `Comparison windows: ${selected.map(item => `${item.label}: ${formatDateLabel(item.start)} to ${formatDateLabel(item.end)}`).join(" · ")}.`;
      const ignoredPeriodsNote = periods.length > maxComparisonPeriods
        ? ` Only the first ${maxComparisonPeriods} recognised periods are shown to keep the comparison readable.`
        : "";
      const tableHeaders = selected.map(item => `<th>${item.label}</th>`).join("");
      result.hidden = false;
      result.innerHTML = `
        <h2 class="section-title">Search Result: ${selected.map(item => item.label).join(" vs ")}</h2>
        <p class="section-subtitle">The dashboard range has been updated automatically. The comparison below reads LM Assist, OTP, daily listings, daily market revenue and daily leads for up to four periods without requiring manual filter setup.</p>
        <div class="compare-summary">
          <div class="compare-card"><span>LM Handover Change</span><strong class="${handoverDelta.className}">${handoverDelta.text}</strong><small>${first.label} to ${last.label}</small></div>
          <div class="compare-card"><span>OTP Revenue Change</span><strong class="${otpDelta.className}">${otpDelta.text}</strong><small>${first.label} to ${last.label}</small></div>
          <div class="compare-card"><span>Listing Change</span><strong class="${listingDelta.className}">${listingDelta.text}</strong><small>${first.label} to ${last.label}</small></div>
          <div class="compare-card"><span>Avg. Daily Revenue Change</span><strong class="${marketRevenueDelta.className}">${marketRevenueDelta.text}</strong><small>${first.label} to ${last.label}</small></div>
          <div class="compare-card"><span>Avg. Daily Lead Change</span><strong class="${leadDelta.className}">${leadDelta.text}</strong><small>${first.label} to ${last.label}</small></div>
          <div class="compare-card"><span>Inactive Share Change</span><strong class="${inactiveShareDelta.className}">${inactiveShareDelta.text}</strong><small>${first.label} to ${last.label}</small></div>
          <div class="compare-card"><span>Net Location Change</span><strong class="${locationNetDelta.className}">${locationNetDelta.text}</strong><small>${first.label} to ${last.label}</small></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Metric</th>${tableHeaders}<th>Change ${first.label} to ${last.label}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <p class="note" style="margin-top:12px;">${comparisonWindowNote}${ignoredPeriodsNote} ${listingNote} ${revenueNote} ${coverageWarning}</p>
      `;
    }

    function runExecutiveSearch() {
      const input = document.getElementById("executiveSearchInput");
      const result = document.getElementById("executiveSearchResult");
      const periods = parseExecutivePeriods(input.value);
      if (!periods.length) {
        result.hidden = false;
        result.innerHTML = `<p class="note">No period was detected. Please use a query like "Compare March 2025 with March 2026", "March 2025 vs March 2026 vs April 2026", "2025 vs 2026" or "first quarter 25 vs first quarter 26".</p>`;
        return;
      }
      renderExecutiveSearchResult(periods);
    }

    function getIsoWeekParts(dateText) {
      const date = new Date(`${dateText}T00:00:00`);
      const working = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const day = working.getUTCDay() || 7;
      working.setUTCDate(working.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(working.getUTCFullYear(), 0, 1));
      const week = Math.ceil((((working - yearStart) / 86400000) + 1) / 7);
      return {
        isoYear: working.getUTCFullYear(),
        isoWeek: week
      };
    }

    function aggregateMarketSeries(rows, mode) {
      const grouped = new Map();
      rows.forEach(row => {
        let key = row.date;
        let label = row.date.slice(5);
        if (mode === "wow") {
          const parts = getIsoWeekParts(row.date);
          key = `${parts.isoYear}-KW${String(parts.isoWeek).padStart(2, "0")}`;
          label = `KW ${String(parts.isoWeek).padStart(2, "0")}/${String(parts.isoYear).slice(2)}`;
        } else if (mode === "mom") {
          key = row.date.slice(0, 7);
          label = formatMonthLabel(key);
        }
        if (!grouped.has(key)) {
          grouped.set(key, {
            key,
            label,
            longtailListings: [],
            longtailLeads: [],
            dealListings: [],
            dealLeads: [],
            longtailListingSource: new Set(),
          });
        }
        const target = grouped.get(key);
        const pushValue = (field, value) => {
          if (value !== null && value !== undefined && Number.isFinite(Number(value))) {
            target[field].push(Number(value));
          }
        };
        pushValue("longtailListings", row.longtailListings);
        pushValue("longtailLeads", row.longtailLeads);
        pushValue("dealListings", row.dealListings);
        pushValue("dealLeads", row.dealLeads);
        if (row.longtailListingSource) target.longtailListingSource.add(row.longtailListingSource);
      });

      const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      const averageOrNull = values => values.length ? average(values) : null;
      return Array.from(grouped.values())
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(item => ({
          key: item.key,
          label: item.label,
          longtailListings: averageOrNull(item.longtailListings) == null ? null : Math.round(average(item.longtailListings)),
          longtailLeads: averageOrNull(item.longtailLeads) == null ? null : Math.round(average(item.longtailLeads)),
          dealListings: averageOrNull(item.dealListings) == null ? null : Math.round(average(item.dealListings)),
          dealLeads: averageOrNull(item.dealLeads) == null ? null : Math.round(average(item.dealLeads)),
          pointCount: Math.max(item.longtailLeads.length, item.dealLeads.length, item.longtailListings.length, item.dealListings.length),
          dealListingPoints: item.dealListings.length,
          longtailListingSources: Array.from(item.longtailListingSource),
        }));
    }

    function groupWeekly(rows) {
      const grouped = new Map();
      rows.forEach(row => grouped.set(row.weekKey, (grouped.get(row.weekKey) || 0) + 1));
      return Array.from(grouped.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([week, value]) => ({ key: week, week, label: week, value }));
    }

    function groupDaily(rows) {
      const grouped = new Map();
      rows.forEach(row => {
        if (!row.date) return;
        grouped.set(row.date, (grouped.get(row.date) || 0) + 1);
      });
      return Array.from(grouped.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([date, value]) => ({
        key: date,
        date,
        label: formatShortDateLabel(date),
        value
      }));
    }

    function groupMonthly(rows) {
      const grouped = new Map();
      rows.forEach(row => grouped.set(row.monthKey, (grouped.get(row.monthKey) || 0) + 1));
      return Array.from(grouped.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([month, value]) => {
        const detail = DATA.lm.monthlySeries.find(item => item.month === month) || {};
        return { key: month, month, label: formatMonthLabel(month), value, storno: detail.storno || 0, revenueNet: detail.revenueNet || 0 };
      });
    }

    function brandCounts(rows) {
      const counts = new Map();
      rows.forEach(row => counts.set(row.brand, (counts.get(row.brand) || 0) + 1));
      return Array.from(counts.entries()).sort((a,b) => b[1]-a[1]).slice(0,8).map(([name, value]) => ({ name, value }));
    }

    function renderChart(series, mode) {
      const canvas = document.getElementById("wowChart");
      const meta = document.getElementById("lmTrendMeta");
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth || 920;
      const height = 380;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      const margin = { top: 54, right: 48, bottom: 66, left: 62 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const values = series.flatMap(item => [item.value, item.storno || 0, item.forecast || 0]);
      const maxValue = Math.max(...values, 1);
      const stepX = innerW / Math.max(series.length - 1, 1);
      const modeCopy = mode === "daily" ? "Daily view" : mode === "mom" ? "Monthly view" : "Weekly view";

      if (!series.length) {
        ctx.fillStyle = "rgba(0,0,0,0.62)";
        ctx.font = "13px Avenir Next, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("No LM Assist handover data is available in the selected range.", 18, 36);
        if (meta) meta.textContent = "No LM Assist trend data in selected range.";
        return;
      }

      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      for (let i=0;i<5;i++) {
        const y = margin.top + (innerH/4)*i;
        ctx.beginPath(); ctx.moveTo(margin.left,y); ctx.lineTo(width-margin.right,y); ctx.stroke();
      }

      const points = series.map((item, idx) => {
        const x = margin.left + stepX * idx;
        const y = margin.top + innerH - ((item.value || 0)/maxValue)*innerH;
        return { x, y, value: item.value, label: item.label || item.week || item.key, idx };
      });
      const peakPoint = points.reduce((best, point) => point.value > best.value ? point : best, points[0]);
      const denseView = points.length > 18;
      const highlightIndexes = new Set([0, points.length - 1, peakPoint.idx]);
      const tickCount = Math.min(denseView ? 7 : 10, points.length);
      const tickIndexes = new Set(Array.from({ length: tickCount }, (_, idx) => Math.round((idx * (points.length - 1)) / Math.max(tickCount - 1, 1))));

      ctx.beginPath();
      points.forEach((point, idx) => {
        if (idx===0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = "#007AC5";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = "#007AC5";
      points.forEach(point => {
        if (denseView && !highlightIndexes.has(point.idx)) return;
        ctx.beginPath();
        ctx.arc(point.x, point.y, denseView ? 4.4 : 4, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = "#000000";
      ctx.font = "12px Avenir Next, sans-serif";
      points.forEach(point => {
        if (denseView && !highlightIndexes.has(point.idx)) return;
        ctx.textAlign = "center";
        ctx.fillText(amount(point.value, point.value >= 1000), point.x, Math.max(point.y - 10, 18));
      });

      if (mode === "mom") {
        const forecastPoint = series.length ? {
          x: points[points.length - 1].x,
          y: margin.top + innerH - (((series[series.length - 1].forecast || 0) / maxValue) * innerH),
          value: series[series.length - 1].forecast || 0
        } : null;

        const stornoPoints = series.map((item, idx) => {
          const x = margin.left + stepX * idx;
          const y = margin.top + innerH - (((item.storno || 0) / maxValue) * innerH);
          return { x, y, value: item.storno || 0 };
        });

        ctx.beginPath();
        stornoPoints.forEach((point, idx) => {
          if (idx === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = "#FFF200";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#000000";
        stornoPoints.forEach((point, idx) => {
          if (denseView && !highlightIndexes.has(idx)) return;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.textAlign = "center";
          ctx.fillText(amount(point.value, point.value >= 1000), point.x, Math.max(point.y - 10, 18));
        });

        if (forecastPoint && forecastPoint.value > 0) {
          ctx.beginPath();
          ctx.arc(forecastPoint.x, forecastPoint.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#FFF200";
          ctx.fill();
          ctx.strokeStyle = "#000000";
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y);
          ctx.lineTo(forecastPoint.x, forecastPoint.y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.textAlign = "right";
          ctx.fillText(`Forecast ${amount(forecastPoint.value, forecastPoint.value >= 1000)}`, Math.min(forecastPoint.x + 2, width - margin.right), Math.max(forecastPoint.y - 12, 24));
          ctx.textAlign = "center";
        }
      }

      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.font = "12px Avenir Next, sans-serif";
      points.forEach((point, idx) => {
        if (!tickIndexes.has(idx)) return;
        ctx.save();
        ctx.translate(point.x, height - 18);
        ctx.rotate(denseView ? -0.42 : -0.32);
        ctx.textAlign = "right";
        ctx.fillText(mode === "mom" ? point.label : point.label.replace("202", "'"), 0, 0);
        ctx.restore();
      });

      if (meta) {
        const latest = points[points.length - 1];
        const cancellationText = mode === "mom"
          ? " Monthly mode includes cancellations and the current-month forecast."
          : "";
        meta.textContent = `${modeCopy} across ${number.format(series.length)} periods. Latest: ${latest.label} with ${number.format(latest.value)} handovers. Peak: ${peakPoint.label} with ${number.format(peakPoint.value)} handovers.${cancellationText}`;
      }
    }

    function renderBudgetRevenueChart(series) {
      const meta = document.getElementById("budgetRevenueMeta");
      const mode = getBudgetChartMode();
      const modeCopy = mode === "mom"
        ? "Monthly average view"
        : mode === "wow"
          ? "Weekly average view"
          : "Daily view";
      const chartConfigs = {
        longtail: {
          canvasId: "longtailRatioChart",
          tableId: "longtailRatioTable",
          listingKey: "longtailListings",
          leadKey: "longtailLeads",
          listingLabel: "Longtail Listings",
          leadLabel: "Longtail Leads",
          colorListings: "#007AC5",
          colorLeads: "#59D7BB",
          missing: "Deal listing snapshot is required to calculate Longtail Listings."
        },
        deal: {
          canvasId: "dealRatioChart",
          tableId: "dealRatioTable",
          listingKey: "dealListings",
          leadKey: "dealLeads",
          listingLabel: "Deal Listings",
          leadLabel: "Deal Leads",
          colorListings: "#000000",
          colorLeads: "#97D7FE",
          missing: "No Deal Listing and Deal Lead overlap is available in the selected range."
        }
      };

      function metricValue(item, key) {
        const value = item[key];
        return value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
      }

      function formatMetricValue(value) {
        return value === null || value === undefined || !Number.isFinite(Number(value)) ? "n/a" : amount(Math.round(value), value >= 1000);
      }

      function visibleRatioRows(config) {
        return series
          .filter(item => metricValue(item, config.listingKey) !== null || metricValue(item, config.leadKey) !== null);
      }

      function renderRatioTable(config, rows) {
        const tbody = document.querySelector(`#${config.tableId} tbody`);
        tbody.innerHTML = "";
        const maxRows = mode === "mom" ? 18 : mode === "wow" ? 12 : 10;
        const visibleRows = rows.length <= maxRows ? rows : rows.slice(-maxRows);
        if (!visibleRows.length) {
          tbody.innerHTML = `<tr><td colspan="4">No matching data in selected range.</td></tr>`;
          return;
        }
        visibleRows.forEach(item => {
          const listings = metricValue(item, config.listingKey);
          const leads = metricValue(item, config.leadKey);
          const rate = listings && leads !== null ? leads / listings : null;
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${item.label}</td>
            <td>${formatMetricValue(listings)}</td>
            <td>${formatMetricValue(leads)}</td>
            <td>${ratio(rate)}</td>
          `;
          tbody.appendChild(tr);
        });
      }

      function renderRatioChart(config) {
        const canvas = document.getElementById(config.canvasId);
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.clientWidth || 440;
        const height = 260;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const values = visibleRatioRows(config);
        renderRatioTable(config, values);

        if (!values.length) {
          ctx.fillStyle = "rgba(0,0,0,0.62)";
          ctx.font = "12px Avenir Next, sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(config.missing, 14, 34);
          return null;
        }

        const margin = { top: 44, right: 38, bottom: 46, left: 52 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;
        const stepX = innerW / Math.max(values.length - 1, 1);
        const denseView = values.length > 28;
        const listingRows = values.filter(item => metricValue(item, config.listingKey) !== null);
        const leadRows = values.filter(item => metricValue(item, config.leadKey) !== null);
        const maxListings = Math.max(...listingRows.map(item => metricValue(item, config.listingKey)), 1);
        const maxLeads = Math.max(...leadRows.map(item => metricValue(item, config.leadKey)), 1);
        const listingPeak = listingRows.length ? listingRows.reduce((best, item) => metricValue(item, config.listingKey) > metricValue(best, config.listingKey) ? item : best, listingRows[0]) : null;
        const leadPeak = leadRows.length ? leadRows.reduce((best, item) => metricValue(item, config.leadKey) > metricValue(best, config.leadKey) ? item : best, leadRows[0]) : null;
        const latest = values[values.length - 1];
        const highlightIndexes = new Set([
          listingPeak ? values.findIndex(item => item.key === listingPeak.key) : -1,
          leadPeak ? values.findIndex(item => item.key === leadPeak.key) : -1,
          values.length - 1
        ].filter(idx => idx >= 0));
        const labelSteps = Math.min(denseView ? 4 : 5, values.length);
        const tickIndexes = new Set(Array.from({ length: labelSteps }, (_, idx) => Math.round((idx * (values.length - 1)) / Math.max(labelSteps - 1, 1))));

        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const y = margin.top + (innerH / 3) * i;
          ctx.beginPath();
          ctx.moveTo(margin.left, y);
          ctx.lineTo(width - margin.right, y);
          ctx.stroke();
        }

        function makePoints(key, maxValue) {
          return values.map((item, idx) => {
            const value = metricValue(item, key);
            if (value === null) return null;
            const x = margin.left + stepX * idx;
            const y = margin.top + innerH - (value / maxValue) * innerH;
            return { x, y, value, label: item.label, key: item.key, idx };
          }).filter(Boolean);
        }

        function drawLine(points, color) {
          ctx.beginPath();
          points.forEach((point, idx) => {
            if (idx === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
          });
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.3;
          ctx.stroke();
          ctx.fillStyle = color;
          points.forEach((point, idx) => {
            if (denseView && !highlightIndexes.has(point.idx)) return;
            ctx.beginPath();
            ctx.arc(point.x, point.y, denseView ? 3.8 : 3.2, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        function drawValueLabels(points, color, placement = "above") {
          ctx.font = "11px Avenir Next, sans-serif";
          ctx.textAlign = "center";
          points.forEach(point => {
            if (!highlightIndexes.has(point.idx)) return;
            const y = placement === "below"
              ? Math.min(point.y + 17, height - margin.bottom + 8)
              : Math.max(point.y - 9, 16);
            ctx.fillStyle = color;
            ctx.fillText(amount(point.value, point.value >= 1000), point.x, y);
          });
        }

        const listingPoints = makePoints(config.listingKey, maxListings);
        const leadPoints = makePoints(config.leadKey, maxLeads);
        drawLine(listingPoints, config.colorListings);
        drawLine(leadPoints, config.colorLeads);
        drawValueLabels(listingPoints, config.colorListings, "above");
        drawValueLabels(leadPoints, config.colorLeads, "below");

        ctx.fillStyle = "rgba(0,0,0,0.62)";
        ctx.textBaseline = "alphabetic";
        values.forEach((item, idx) => {
          if (!tickIndexes.has(idx)) return;
          const x = margin.left + stepX * idx;
          ctx.save();
          ctx.translate(x, height - 12);
          ctx.rotate(denseView ? -0.42 : -0.28);
          ctx.textAlign = "right";
          ctx.fillText(item.label.replace("202", "'"), 0, 0);
          ctx.restore();
        });

        ctx.font = "11px Avenir Next, sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = config.colorListings;
        ctx.fillText(config.listingLabel, margin.left, 18);
        ctx.fillStyle = config.colorLeads;
        ctx.fillText(config.leadLabel, margin.left + 128, 18);

        return {
          config,
          values,
          latest,
          listingPeak,
          leadPeak,
          latestRate: metricValue(latest, config.listingKey) && metricValue(latest, config.leadKey) !== null ? metricValue(latest, config.leadKey) / metricValue(latest, config.listingKey) : null
        };
      }

      if (!series.length) {
        Object.values(chartConfigs).forEach(config => renderRatioChart(config));
        meta.textContent = "No overlapping listing and lead history is available inside the selected range.";
        return;
      }

      const summaries = Object.values(chartConfigs).map(renderRatioChart).filter(Boolean);
      const dealCoverage = series.filter(item => item.dealListings !== null && item.dealListings !== undefined).length;
      const latestSummary = summaries.map(item => `${item.config.listingLabel}: ${formatMetricValue(metricValue(item.latest, item.config.listingKey))} / ${item.config.leadLabel}: ${formatMetricValue(metricValue(item.latest, item.config.leadKey))} / Leads per Listing ${ratio(item.latestRate)}`).join(" · ");
      const peakSummary = summaries.map(item => {
        const listingText = item.listingPeak ? `${item.config.listingLabel} peak ${formatMetricValue(metricValue(item.listingPeak, item.config.listingKey))} in ${item.listingPeak.label}` : `${item.config.listingLabel} peak n/a`;
        const leadText = item.leadPeak ? `${item.config.leadLabel} peak ${formatMetricValue(metricValue(item.leadPeak, item.config.leadKey))} in ${item.leadPeak.label}` : `${item.config.leadLabel} peak n/a`;
        return `${listingText}; ${leadText}`;
      }).join(". ");
      const coverageText = dealCoverage
        ? `Deal-listing coverage: ${number.format(dealCoverage)} of ${number.format(series.length)} visible periods have snapshot data.`
        : "Deal-listing coverage: no snapshot data is available in the selected range.";
      meta.textContent = `${modeCopy} across ${number.format(series.length)} periods. ${coverageText} Latest: ${latestSummary}. ${peakSummary}.`;
    }

    function renderBudgetPattern(series) {
      const headline = document.getElementById("budgetPatternHeadline");
      const summary = document.getElementById("budgetPatternSummary");
      const forecast = document.getElementById("budgetPatternForecast");
      const relation = DATA.lm.revenueContext.relationship;

      if (!series.length) {
        headline.textContent = "No range-based pattern can be evaluated because the selected range has no overlapping listings and revenue data.";
        summary.textContent = "";
        forecast.textContent = "";
        return;
      }

      const avgListings = series.reduce((sum, row) => sum + row.activeListings, 0) / series.length;
      const avgRevenue = series.reduce((sum, row) => sum + row.netRevenue, 0) / series.length;
      headline.textContent = `Selected range average: ${amount(Math.round(avgListings), true)} active listings and ${money(avgRevenue, true)} daily net revenue. Executive signal strength: ${relation.signalStrength}.`;

      if ((relation.validSignalMonths || 0) < 3 || relation.elasticity == null || relation.overallDailyCorrelation == null) {
        summary.textContent = "The historic listing-to-revenue relationship is not yet strong enough for a standalone revenue forecast.";
        forecast.textContent = "Management interpretation: reduced listings should still be treated as operational risk, but the current history does not prove a stable revenue impact with enough confidence.";
        return;
      }

      summary.textContent = `Across ${number.format(relation.validSignalMonths)} usable historical months, the daily listings-to-revenue correlation is ${relation.overallDailyCorrelation.toFixed(2)} and ${pct.format(relation.sameDirectionRatio || 0)} of monthly half-on-half moves pointed in the same direction.`;

      const focusMonth = series[series.length - 1].date.slice(0, 7);
      const currentMonthSeries = DATA.lm.revenueContext.combinedDaily.filter(item => item.date.startsWith(focusMonth));
      const previousYearSeries = DATA.lm.revenueContext.combinedDaily.filter(item => item.date.startsWith(`${parseInt(focusMonth.slice(0, 4), 10) - 1}-${focusMonth.slice(5)}`));
      if (!currentMonthSeries.length || !previousYearSeries.length) {
        forecast.textContent = "No same-month previous-year comparison is available for a directional listing-impact forecast.";
        return;
      }
      const currentAvgListings = currentMonthSeries.reduce((sum, row) => sum + row.activeListings, 0) / currentMonthSeries.length;
      const previousAvgListings = previousYearSeries.reduce((sum, row) => sum + row.activeListings, 0) / previousYearSeries.length;
      const listingDeltaPct = previousAvgListings ? (currentAvgListings / previousAvgListings - 1) : 0;
      const forecastRevenueImpact = listingDeltaPct * relation.elasticity;

      if (Math.abs(listingDeltaPct) < 0.02) {
        forecast.textContent = `For ${formatMonthLabel(focusMonth)}, active listings are only ${pct.format(listingDeltaPct)} versus the same month last year. Forecast view: the listing delta is too small to imply a material revenue effect on its own.`;
      } else {
        forecast.textContent = `For ${formatMonthLabel(focusMonth)}, active listings are ${pct.format(listingDeltaPct)} versus the same month last year. If the historical pattern repeats, this implies a directional revenue effect of approximately ${pct.format(forecastRevenueImpact)} for the month.`;
      }
    }

    function buildInactiveForecast(rows) {
      if (!rows.length) return null;
      const latest = rows[rows.length - 1];
      const base = rows.slice(-3);
      const avgInactive = base.reduce((sum, row) => sum + (row.newlyInactive || 0), 0) / base.length;
      const avgActivated = base.reduce((sum, row) => sum + (row.newlyActivated || 0), 0) / base.length;
      const projectedNet = avgActivated - avgInactive;
      const projectedActive = Math.max(Math.round((latest.activeLocations || 0) + projectedNet), 0);
      const projectedInactive = Math.round(avgInactive);
      const projectedTotal = projectedActive + projectedInactive;
      return {
        sourceMonths: base.map(row => row.label),
        projectedNewlyInactive: projectedInactive,
        projectedNewlyActivated: Math.round(avgActivated),
        projectedNetChange: Math.round(projectedNet),
        projectedActiveLocations: projectedActive,
        projectedInactiveShare: projectedTotal ? projectedInactive / projectedTotal : null
      };
    }

    function signedAmount(value) {
      if (value == null || !Number.isFinite(Number(value))) return "n/a";
      const sign = value > 0 ? "+" : value < 0 ? "-" : "";
      return `${sign}${number.format(Math.abs(Math.round(value)))}`;
    }

    function drawInactiveMovementChart(rows) {
      const canvas = document.getElementById("inactiveMovementChart");
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth || 620;
      const height = 300;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      if (!rows.length) {
        ctx.fillStyle = "rgba(0,0,0,0.62)";
        ctx.font = "13px Avenir Next, sans-serif";
        ctx.fillText("No inactive-location data in selected range.", 20, 36);
        return;
      }
      const margin = { top: 46, right: 36, bottom: 52, left: 52 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const values = rows.flatMap(row => [row.newlyInactive || 0, row.newlyActivated || 0, row.netLocationChange || 0]);
      const maxAbs = Math.max(...values.map(value => Math.abs(value)), 1);
      const zeroY = margin.top + innerH / 2;
      const stepX = innerW / Math.max(rows.length - 1, 1);
      const series = [
        { key: "newlyInactive", label: "Newly Inactive", color: "#000000" },
        { key: "newlyActivated", label: "Newly Activated", color: "#59D7BB" },
        { key: "netLocationChange", label: "Net Change", color: "#007AC5" }
      ];
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      for (let i = 0; i < 5; i++) {
        const y = margin.top + (innerH / 4) * i;
        ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(width - margin.right, y); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.moveTo(margin.left, zeroY); ctx.lineTo(width - margin.right, zeroY); ctx.stroke();
      series.forEach((def, seriesIndex) => {
        const points = rows.map((row, idx) => {
          const value = Number(row[def.key] || 0);
          return {
            x: margin.left + stepX * idx,
            y: zeroY - (value / maxAbs) * (innerH / 2),
            value,
            label: row.label
          };
        });
        ctx.beginPath();
        points.forEach((point, idx) => idx ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.fillStyle = def.color;
        points.forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
        const latest = points[points.length - 1];
        ctx.textAlign = "right";
        ctx.font = "12px Avenir Next, sans-serif";
        ctx.fillText(signedAmount(latest.value), Math.min(latest.x + 10, width - margin.right), Math.max(latest.y - 8 + seriesIndex * 13, 16));
      });
      ctx.textAlign = "left";
      ctx.font = "12px Avenir Next, sans-serif";
      series.forEach((def, idx) => {
        ctx.fillStyle = def.color;
        ctx.fillText(def.label, margin.left + idx * 138, 20);
      });
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      const labelSteps = Math.min(6, rows.length);
      const tickIndexes = new Set(Array.from({ length: labelSteps }, (_, idx) => Math.round((idx * (rows.length - 1)) / Math.max(labelSteps - 1, 1))));
      rows.forEach((row, idx) => {
        if (!tickIndexes.has(idx)) return;
        const x = margin.left + stepX * idx;
        ctx.save();
        ctx.translate(x, height - 14);
        ctx.rotate(-0.28);
        ctx.textAlign = "right";
        ctx.fillText(row.label.replace("202", "'"), 0, 0);
        ctx.restore();
      });
    }

    function drawInactiveShareChart(rows) {
      const canvas = document.getElementById("inactiveShareTrendChart");
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth || 620;
      const height = 300;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      if (!rows.length) {
        ctx.fillStyle = "rgba(0,0,0,0.62)";
        ctx.font = "13px Avenir Next, sans-serif";
        ctx.fillText("No inactive-share data in selected range.", 20, 36);
        return;
      }
      const margin = { top: 46, right: 38, bottom: 52, left: 54 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const stepX = innerW / Math.max(rows.length - 1, 1);
      const maxShare = Math.max(...rows.map(row => row.inactiveShare || 0), 0.01);
      const maxActive = Math.max(...rows.map(row => row.activeLocations || 0), 1);
      const minActive = Math.min(...rows.map(row => row.activeLocations || 0), maxActive);
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      for (let i = 0; i < 5; i++) {
        const y = margin.top + (innerH / 4) * i;
        ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(width - margin.right, y); ctx.stroke();
      }
      function pointsFor(key, maxValue, minValue = 0) {
        return rows.map((row, idx) => {
          const value = Number(row[key] || 0);
          const denominator = Math.max(maxValue - minValue, 1);
          const normalized = key === "activeLocations" ? (value - minValue) / denominator : value / maxValue;
          return {
            x: margin.left + stepX * idx,
            y: margin.top + innerH - normalized * innerH,
            value,
            label: row.label
          };
        });
      }
      const activePoints = pointsFor("activeLocations", maxActive, minActive);
      const sharePoints = pointsFor("inactiveShare", maxShare);
      [
        { points: activePoints, color: "#97D7FE", width: 2, dash: [5, 5] },
        { points: sharePoints, color: "#000000", width: 2.8, dash: [] }
      ].forEach(def => {
        ctx.beginPath();
        def.points.forEach((point, idx) => idx ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
        ctx.strokeStyle = def.color;
        ctx.lineWidth = def.width;
        ctx.setLineDash(def.dash);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = def.color;
        def.points.forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 3.4, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      const latestShare = sharePoints[sharePoints.length - 1];
      const latestActive = activePoints[activePoints.length - 1];
      ctx.font = "12px Avenir Next, sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = "#000000";
      ctx.fillText(pct.format(latestShare.value), Math.min(latestShare.x + 8, width - margin.right), Math.max(latestShare.y - 10, 16));
      ctx.fillStyle = "#007AC5";
      ctx.fillText(amount(latestActive.value, true), Math.min(latestActive.x + 8, width - margin.right), Math.min(latestActive.y + 18, height - margin.bottom + 8));
      ctx.textAlign = "left";
      ctx.fillStyle = "#000000";
      ctx.fillText("Inactive Share", margin.left, 20);
      ctx.fillStyle = "#007AC5";
      ctx.fillText("Active Locations", margin.left + 132, 20);
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      const labelSteps = Math.min(6, rows.length);
      const tickIndexes = new Set(Array.from({ length: labelSteps }, (_, idx) => Math.round((idx * (rows.length - 1)) / Math.max(labelSteps - 1, 1))));
      rows.forEach((row, idx) => {
        if (!tickIndexes.has(idx)) return;
        const x = margin.left + stepX * idx;
        ctx.save();
        ctx.translate(x, height - 14);
        ctx.rotate(-0.28);
        ctx.textAlign = "right";
        ctx.fillText(row.label.replace("202", "'"), 0, 0);
        ctx.restore();
      });
    }

    function renderInactiveLocationTable(rows) {
      const tbody = document.querySelector("#inactiveLocationsTable tbody");
      tbody.innerHTML = "";
      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="8">No inactive dealer location data in the selected range.</td></tr>`;
        return;
      }
      rows.forEach(row => {
        const shareMove = row.momInactiveSharePoints == null ? "n/a" : `${row.momInactiveSharePoints >= 0 ? "+" : ""}${(row.momInactiveSharePoints * 100).toFixed(1).replace(".", ",")} pp`;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.label}</td>
          <td>${number.format(row.activeLocations)}</td>
          <td>${number.format(row.newlyInactive)}</td>
          <td>${number.format(row.newlyActivated)}</td>
          <td class="${cls(row.netLocationChange)}">${signedAmount(row.netLocationChange)}</td>
          <td>${pct.format(row.inactiveShare || 0)}</td>
          <td class="${row.momInactiveSharePoints == null ? "neutral" : cls(-row.momInactiveSharePoints)}">${shareMove}</td>
          <td>${row.yoyActiveLocations == null ? "n/a" : pct.format(row.yoyActiveLocations)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    function renderInactiveLocations(rows) {
      const fallbackRows = DATA.inactiveLocations?.monthlySeries || [];
      const visibleRows = rows;
      const latest = visibleRows.length ? visibleRows[visibleRows.length - 1] : null;
      const previous = latest ? fallbackRows.filter(row => row.month < latest.month).slice(-1)[0] : null;
      const forecast = buildInactiveForecast(visibleRows);
      const shareMove = latest && previous && latest.inactiveShare != null && previous.inactiveShare != null
        ? latest.inactiveShare - previous.inactiveShare
        : null;
      document.getElementById("inactiveShare").textContent = latest ? pct.format(latest.inactiveShare || 0) : "n/a";
      document.getElementById("inactiveShare").className = `kpi ${shareMove == null ? "neutral" : cls(-shareMove)}`;
      document.getElementById("inactiveShareNote").textContent = latest
        ? `${latest.label}: ${number.format(latest.newlyInactive)} newly inactive out of ${number.format(latest.totalLocations)} total locations.`
        : "No inactive location month is available.";
      document.getElementById("inactiveNewlyInactive").textContent = latest ? number.format(latest.newlyInactive) : "n/a";
      document.getElementById("inactiveNewlyInactiveNote").textContent = latest && previous
        ? `${latest.label} versus ${previous.label}: ${signedAmount(latest.newlyInactive - previous.newlyInactive)} locations.`
        : "Not enough monthly history for a previous-month comparison.";
      document.getElementById("inactiveNewlyActivated").textContent = latest ? number.format(latest.newlyActivated) : "n/a";
      document.getElementById("inactiveNewlyActivatedNote").textContent = latest && previous
        ? `${latest.label} versus ${previous.label}: ${signedAmount(latest.newlyActivated - previous.newlyActivated)} locations reactivated.`
        : "Not enough monthly history for a previous-month comparison.";
      document.getElementById("inactiveNetChange").textContent = latest ? signedAmount(latest.netLocationChange) : "n/a";
      document.getElementById("inactiveNetChange").className = `kpi ${latest ? cls(latest.netLocationChange) : "neutral"}`;
      document.getElementById("inactiveNetChangeNote").textContent = latest
        ? `${latest.label} net movement after reactivations.`
        : "No net location movement is available.";
      document.getElementById("inactiveForecast").textContent = forecast ? pct.format(forecast.projectedInactiveShare || 0) : "n/a";
      document.getElementById("inactiveForecastNote").textContent = forecast
        ? `Next-month directional view: ${number.format(forecast.projectedNewlyInactive)} newly inactive, ${number.format(forecast.projectedNewlyActivated)} reactivated, net ${signedAmount(forecast.projectedNetChange)}.`
        : "No forecast is available for the selected range.";
      document.getElementById("inactiveLocationsMeta").textContent = latest
        ? `Latest selected month: ${latest.label} · Active base ${number.format(latest.activeLocations)} locations.`
        : "No inactive dealer location data available.";
      document.getElementById("inactiveLocationsCoverage").textContent = visibleRows.length
        ? `${number.format(visibleRows.length)} monthly data points · Forecast uses latest ${Math.min(3, visibleRows.length)} selected months.`
        : "No monthly data points in selected range.";
      drawInactiveMovementChart(visibleRows);
      drawInactiveShareChart(visibleRows);
      renderInactiveLocationTable(visibleRows);
    }

    function getSelectedMode() {
      return document.body.dataset.chartMode || "mom";
    }

    function setSelectedMode(mode) {
      document.body.dataset.chartMode = mode;
      const dailyButton = document.getElementById("dailyMode");
      if (dailyButton) dailyButton.className = mode === "daily" ? "primary" : "";
      document.getElementById("wowMode").className = mode === "wow" ? "primary" : "";
      document.getElementById("momMode").className = mode === "mom" ? "primary" : "";
    }

    function ensureLmTrendControls() {
      const wowButton = document.getElementById("wowMode");
      const toggleGroup = wowButton?.closest(".toggle-group");
      if (toggleGroup && !document.getElementById("dailyMode")) {
        const dailyButton = document.createElement("button");
        dailyButton.id = "dailyMode";
        dailyButton.type = "button";
        dailyButton.textContent = "Daily";
        toggleGroup.insertBefore(dailyButton, wowButton);
      }

      const subtitle = document.querySelector("#lmTrendSection .section-subtitle");
      if (subtitle) {
        subtitle.textContent = "Switch between Daily handovers, weekly WoW and monthly MoM. Monthly mode also includes cancellations and the current-month forecast.";
      }

      const chart = document.getElementById("wowChart");
      if (chart && !document.getElementById("lmTrendMeta")) {
        const meta = document.createElement("div");
        meta.className = "note";
        meta.id = "lmTrendMeta";
        chart.insertAdjacentElement("afterend", meta);
      }
    }

    function getBudgetChartMode() {
      return document.body.dataset.budgetChartMode || "mom";
    }

    function setBudgetChartMode(mode) {
      document.body.dataset.budgetChartMode = mode;
      document.getElementById("budgetDailyMode").className = mode === "daily" ? "primary" : "";
      document.getElementById("budgetWowMode").className = mode === "wow" ? "primary" : "";
      document.getElementById("budgetMomMode").className = mode === "mom" ? "primary" : "";
    }

    function createBars(items) {
      const target = document.getElementById("brandList");
      target.innerHTML = "";
      const maxValue = Math.max(...items.map(item => item.value), 1);
      items.forEach(item => {
        const div = document.createElement("div");
        div.className = "bar-row";
        div.innerHTML = `
          <div class="bar-head"><div>${item.name}</div><div>${number.format(item.value)}</div></div>
          <div class="bar-track"><div class="bar-fill alt" style="width:${(item.value/maxValue)*100}%"></div></div>
        `;
        target.appendChild(div);
      });
    }

    function renderLmMonthTable(activeMonthKeys) {
      const tbody = document.querySelector("#lmMonthTable tbody");
      tbody.innerHTML = "";
      const rows = DATA.lm.monthlySeries.filter(row => !activeMonthKeys || activeMonthKeys.has(row.month));
      rows.forEach(row => {
        const isCurrentMonth = row.month === DATA.lm.forecast.currentMonth;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${formatMonthLabel(row.month)}</td>
          <td>${number.format(row.value)}</td>
          <td>${row.storno == null ? "n/a" : number.format(row.storno)}</td>
          <td>${row.revenueNet == null ? "n/a" : euro.format(row.revenueNet)}</td>
          <td>${row.pricePerHandover == null ? "n/a" : euro.format(row.pricePerHandover)}</td>
          <td>${isCurrentMonth ? number.format(DATA.lm.forecast.currentMonthForecast) : "—"}</td>
          <td>${isCurrentMonth ? euro.format(DATA.lm.forecast.currentMonthRevenueForecast) : "—"}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    function renderOtpTable(rows) {
      const tbody = document.querySelector("#otpTable tbody");
      tbody.innerHTML = "";
      rows.forEach((row, index) => {
        const currentValue = row.expectedRevenue || row.actual2026 || 0;
        const previous = rows.slice(0, index).reverse().find(item => (item.expectedRevenue || item.actual2026 || 0) > 0);
        const previousValue = previous ? (previous.expectedRevenue || previous.actual2026 || 0) : 0;
        const mom = previous && currentValue > 0 && previousValue > 0 ? (currentValue / previousValue - 1) : null;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.period}</td>
          <td>${row.actual2026 ? euro.format(row.actual2026) : "—"}</td>
          <td class="${mom == null ? "neutral" : cls(mom)}">${mom == null ? "—" : pct.format(mom)}</td>
          <td>${row.expectedRevenue == null ? "—" : euro.format(row.expectedRevenue)}</td>
          <td>${euro.format(row.target2026)}</td>
          <td>${euro.format(row.actual2025)}</td>
          <td class="${row.gapToTarget == null ? "neutral" : cls(row.gapToTarget)}">${row.gapToTarget == null ? "—" : euro.format(row.gapToTarget)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    function latestMonthKey(rows) {
      const months = Array.from(new Set(rows.map(row => row.monthKey))).sort();
      return months[months.length - 1];
    }

    function renderLmInsights(rows) {
      const target = document.getElementById("lmInsights");
      target.innerHTML = "";
      if (!rows.length) {
        target.innerHTML = "<li>No LM Assist data is available for the selected period.</li>";
        return;
      }

      const weekly = groupWeekly(rows);
      const lastWeek = weekly[weekly.length - 1];
      const prevWeek = weekly.length > 1 ? weekly[weekly.length - 2] : null;
      const brands = brandCounts(rows);
      const totalRows = rows.length;

      const models = new Map();
      const dealers = new Map();
      rows.forEach(row => {
        const modelKey = `${row.brand} ${row.model}`;
        models.set(modelKey, (models.get(modelKey) || 0) + 1);
        dealers.set(row.dealer, (dealers.get(row.dealer) || 0) + 1);
      });
      const topModel = Array.from(models.entries()).sort((a,b) => b[1]-a[1])[0];
      const topDealer = Array.from(dealers.entries()).sort((a,b) => b[1]-a[1])[0];
      const latestMonth = latestMonthKey(rows);
      const latestMonthSummary = DATA.lm.monthlySeries.find(item => item.month === latestMonth);
      const previousMonthSummary = DATA.lm.monthlySeries.filter(item => item.month < latestMonth).slice(-1)[0];

      const insights = [];
      if (brands[0]) {
        const share = brands[0].value / totalRows;
        insights.push(`Brand ${brands[0].name} represents ${number.format(brands[0].value)} of ${number.format(totalRows)} handovers in the selected period (${pct.format(share)} share). Recommended action: prioritise outbound calls to dealers from this brand and secure additional immediately activatable offers.`);
      }
      if (topModel) {
        const share = topModel[1] / totalRows;
        insights.push(`Model ${topModel[0]} is highly visible with ${number.format(topModel[1])} handovers (${pct.format(share)} share). Recommended action: prioritise this model commercially and extend similar configurations across additional dealers.`);
      }
      if (prevWeek) {
        const diff = lastWeek.value - prevWeek.value;
        const wow = prevWeek.value ? diff / prevWeek.value : 0;
        const action = diff >= 0
          ? "use the momentum and approach high-performing dealers for incremental volume."
          : "follow up immediately with affected dealers and models to stop the decline early.";
        insights.push(`In the latest WoW comparison, ${lastWeek.week} closed at ${number.format(lastWeek.value)} handovers versus ${number.format(prevWeek.value)} in ${prevWeek.week} (${pct.format(wow)}). Recommended action: ${action}`);
      }
      if (latestMonthSummary && previousMonthSummary) {
        const mom = previousMonthSummary.value ? (latestMonthSummary.value / previousMonthSummary.value - 1) : 0;
        insights.push(`The current month stands at ${number.format(latestMonthSummary.value)} handovers versus ${number.format(previousMonthSummary.value)} in the previous month (${pct.format(mom)}). Recommended action: monitor the live month forecast daily and escalate any supply bottlenecks immediately.`);
      }
      if (latestMonthSummary && latestMonthSummary.storno != null) {
        const stornoQuote = latestMonthSummary.value ? latestMonthSummary.storno / latestMonthSummary.value : 0;
        insights.push(`For ${latestMonth}, ${number.format(latestMonthSummary.storno)} cancellations are visible against ${number.format(latestMonthSummary.value)} handovers (${pct.format(stornoQuote)}). Recommended action: prioritise cancellation root causes in dealer conversations and review quality patterns in high-risk leads.`);
      }
      if (topDealer) {
        insights.push(`Dealer ${topDealer[0]} contributes ${number.format(topDealer[1])} handovers in the selected period. Recommended action: keep top dealers closely engaged while broadening the active base to reduce concentration risk.`);
      }

      insights.slice(0, 5).forEach(text => {
        const li = document.createElement("li");
        li.textContent = text;
        target.appendChild(li);
      });
    }

    function renderOtpInsights(filteredRows) {
      const target = document.getElementById("otpInsights");
      target.innerHTML = "";
      const rows = filteredRows.length ? filteredRows : DATA.otp.rows;
      const range = currentRange();
      const rangeLabel = range.start && range.end ? `${range.start} to ${range.end}` : "the selected period";
      const actualMonths = rows.filter(row => row.actual2026 > 0);
      const weakestMonth = actualMonths.slice().sort((a, b) => (a.yoy26vs25 || 0) - (b.yoy26vs25 || 0))[0];
      const latestActualMonth = actualMonths[actualMonths.length - 1];
      const previousActualMonth = actualMonths.length > 1 ? actualMonths[actualMonths.length - 2] : null;
      const focusMonth = rows[rows.length - 1];
      const latestMom = latestActualMonth && previousActualMonth ? (latestActualMonth.actual2026 / previousActualMonth.actual2026 - 1) : null;
      const focusAchievement = focusMonth && focusMonth.target2026 ? focusMonth.expectedRevenue / focusMonth.target2026 : null;
      const bookingMonths = rows.filter(row => row.bookings != null);
      const latestBookingMonth = bookingMonths[bookingMonths.length - 1];
      const previousBookingMonth = bookingMonths.length > 1 ? bookingMonths[bookingMonths.length - 2] : null;
      const bookingMom = latestBookingMonth && previousBookingMonth && previousBookingMonth.bookings ? (latestBookingMonth.bookings / previousBookingMonth.bookings - 1) : null;
      const bookingTopProduct = latestBookingMonth?.topBookedProduct;
      const strongestPositive = DATA.otp.productTrends.topPositive[0];
      const strongestNegative = DATA.otp.productTrends.topNegative[0];

      const insights = [
        focusMonth ? `For ${rangeLabel}, the focus month ${focusMonth.period} is expected to deliver ${euro.format(focusMonth.expectedRevenue)} against a target of ${euro.format(focusMonth.target2026)} (${pct.format(focusAchievement || 0)} achievement). Recommended action: if achievement remains below plan, prioritise short-term sell actions and dealer attention on high-conversion products.` : `No OTP month is available for the selected period.`,
        focusMonth ? `The expected gap versus target for ${focusMonth.period} currently stands at ${euro.format(focusMonth.gapToTarget)}. Recommended action: use the gap as the primary steering metric for weekly commercial follow-up and campaign prioritisation.` : `No OTP target gap can be calculated for the selected period.`,
        latestBookingMonth ? `Booking volume in ${latestBookingMonth.period} stands at ${number.format(latestBookingMonth.bookings)} bookings${latestBookingMonth.bookingsYoy == null ? "" : `, with a YoY movement of ${pct.format(latestBookingMonth.bookingsYoy)}`}. Recommended action: monitor whether booking momentum is converting into expected revenue and intervene quickly if bookings stay healthy while revenue underperforms.` : `No OTP booking volume is available for the selected period.`,
        latestBookingMonth && previousBookingMonth && latestActualMonth && previousActualMonth ? `Booking momentum moved from ${number.format(previousBookingMonth.bookings)} in ${previousBookingMonth.period} to ${number.format(latestBookingMonth.bookings)} in ${latestBookingMonth.period} (${pct.format(bookingMom || 0)} MoM), while revenue moved from ${euro.format(previousActualMonth.actual2026)} to ${euro.format(latestActualMonth.actual2026)} (${pct.format(latestMom || 0)} MoM). Recommended action: if bookings hold up while revenue weakens, focus on conversion quality, dealer follow-up and pricing discipline.` : `There are not enough booking and revenue months within ${rangeLabel} for a combined momentum comparison.`,
        bookingTopProduct ? `The most booked OTP product in ${latestBookingMonth.period} is ${bookingTopProduct} with ${number.format(latestBookingMonth.topBookedProductVolume || 0)} bookings. ${strongestPositive ? `${strongestPositive.product} remains the strongest longer-term product trend at ${pct.format(strongestPositive.growth)} versus 2024.` : strongestNegative ? `${strongestNegative.product} remains under pressure at ${pct.format(strongestNegative.growth)} versus 2024.` : ""} Recommended action: align sales attention, dealer outreach and visibility measures around the products that combine strong booking demand with better revenue conversion.` : (weakestMonth ? `The weakest actual 2026 month within ${rangeLabel} is currently ${weakestMonth.period} at ${pct.format(weakestMonth.yoy26vs25 || 0)} YoY. Recommended action: prioritise root-cause analysis for this month and intensify guidance for affected dealers.` : `No clear product or month outlier is currently visible in the available OTP data.`)
      ];

      insights.slice(0, 5).forEach(text => {
        const li = document.createElement("li");
        li.textContent = text;
        target.appendChild(li);
      });
    }

    function updateView() {
      const lmRows = filterLmRows();
      const otpRows = filterOtpRows();
      const budget = DATA.budget;
      const marketRows = filterMarketDailyRows();
      const inactiveRows = filterInactiveLocationRows();
      const marketSeries = aggregateMarketSeries(marketRows, getBudgetChartMode());
      const days = groupDaily(lmRows);
      const weeks = groupWeekly(lmRows);
      const months = groupMonthly(lmRows).map((item, index, arr) => ({
        ...item,
        forecast: index === arr.length - 1 ? DATA.lm.forecast.currentMonthForecast : 0
      }));
      const renderMode = getSelectedMode();
      setSelectedMode(renderMode);
      const lmTrendSeries = renderMode === "daily" ? days : renderMode === "mom" ? months : weeks;
      renderChart(lmTrendSeries, renderMode);
      renderBudgetRevenueChart(marketSeries);
      renderBudgetPattern(marketRows);
      renderInactiveLocations(inactiveRows);
      createBars(brandCounts(lmRows));
      renderLmMonthTable(new Set(months.map(item => item.month)));
      renderOtpTable(otpRows);

      const budgetHistory = budget.history || [];
      const previousBudget = budgetHistory.length > 1 ? budgetHistory[budgetHistory.length - 2] : null;
      const currentBudget = budgetHistory.length ? budgetHistory[budgetHistory.length - 1] : null;
      const latestActiveListingDay = DATA.lm.revenueContext.latestActiveListingsDay;
      document.getElementById("budgetOfflineDealers").textContent = number.format(budget.offlineDealers);
      document.getElementById("budgetOfflineDealersNote").textContent = "Confirmed dealers currently offline because budget is exhausted.";
      document.getElementById("budgetNearLimitDealers").textContent = number.format(budget.nearLimitDealers);
      document.getElementById("budgetNearLimitDealersNote").textContent = "Dealers above 90% budget usage, not yet counted as offline.";
      document.getElementById("budgetActiveListings").textContent = latestActiveListingDay ? number.format(latestActiveListingDay.activeListings) : "n/a";
      document.getElementById("budgetActiveListingsNote").textContent = latestActiveListingDay ? `Latest file-based active listings: ${latestActiveListingDay.date}.` : "No active listing file value is available.";
      document.getElementById("budgetDisplayedListings").textContent = number.format(budget.listingBenchmark);
      document.getElementById("budgetDisplayedListingsNote").textContent = "Currently displayed live listings from LeasingMarkt.";
      document.getElementById("budgetOfflineListings").textContent = budget.offlineListings == null ? "n/a" : number.format(budget.offlineListings);
      document.getElementById("budgetOfflineListingsNote").textContent = budget.offlineListings == null
        ? "The uploaded Budget offline CSV does not contain listing counts, so the offline listing KPI is not available for this update."
        : "Listings currently unavailable because budget-constrained dealers are offline.";
      document.getElementById("budgetListingLossPct").textContent = budget.lossPctVsActive == null ? "n/a" : pct.format(budget.lossPctVsActive);
      document.getElementById("budgetListingLossPctNote").textContent = budget.lossPctVsActive == null
        ? "The uploaded Budget offline CSV does not contain Inserate data, so the offline share of displayed listings cannot be calculated for this update."
        : "Share of displayed live listings currently unavailable due to budget limits.";
      document.getElementById("budgetRisk3Days").textContent = number.format(budget.within3DaysOffline);
      document.getElementById("budgetRisk3DaysNote").textContent = `Additional dealers forecast to run out of budget within 3 days. Average risk horizon: ${budget.avgDaysToOffline.toFixed(1)} days.`;
      document.getElementById("budgetMeta").textContent = previousBudget && currentBudget
        ? `Latest budget snapshot: offline dealers moved from ${number.format(previousBudget.actualOfflineDealers)} to ${number.format(currentBudget.actualOfflineDealers)}; budget-offline listings moved from ${previousBudget.offlineListings == null ? "n/a" : number.format(previousBudget.offlineListings)} to ${currentBudget.offlineListings == null ? "n/a" : number.format(currentBudget.offlineListings)}.`
        : `Live listing reference refreshed at generation time · 20.05.2026 13:44`;

      const latestMonth = months[months.length - 1];
      const previousMonth = months.length > 1 ? months[months.length - 2] : null;
      document.getElementById("lmCount").textContent = latestMonth ? number.format(latestMonth.value) : "0";
      if (latestMonth && previousMonth) {
        const mom = previousMonth.value ? (latestMonth.value / previousMonth.value - 1) : 0;
        document.getElementById("lmCountNote").textContent = `${latestMonth.label} month-to-date versus ${previousMonth.label} at ${number.format(previousMonth.value)} handovers (${pct.format(mom)}).`;
      } else {
        document.getElementById("lmCountNote").textContent = "Not enough monthly history is available within the selected range for a month-over-month comparison.";
      }

      document.getElementById("lmForecast").textContent = number.format(DATA.lm.forecast.currentMonthForecast);
      document.getElementById("lmForecastNote").textContent = `${DATA.lm.forecast.currentMonth} projected handovers based on current month pacing.`;
      document.getElementById("lmRevenueForecast").textContent = euro.format(DATA.lm.forecast.currentMonthRevenueForecast);
      document.getElementById("lmRevenueForecastNote").textContent = `Based on EUR ${number.format(DATA.lm.forecast.assumedPricePerHandover)} per handover.`;
      const lmRevenueShare = DATA.lm.revenueContext.latestComparableMonthShare;
      const lastCompleteDay = DATA.lm.revenueContext.latestCompleteDay;
      const selectedMarketRevenue = marketRows.reduce((sum, row) => sum + row.netRevenue, 0);
      const estimatedLmRangeRevenue = lmRows.length * DATA.lm.forecast.assumedPricePerHandover;
      const selectedShare = selectedMarketRevenue ? (estimatedLmRangeRevenue / selectedMarketRevenue) : null;
      document.getElementById("lmRevenueMeta").textContent = lmRevenueShare
        ? `Revenue context: selected-range estimated LM Assist share is ${selectedShare == null ? "n/a" : pct.format(selectedShare)} at EUR ${number.format(DATA.lm.forecast.assumedPricePerHandover)} per handover. Latest completed month share: ${pct.format(lmRevenueShare.share || 0)} in ${formatMonthLabel(lmRevenueShare.month)}.`
        : "Revenue context: no completed month is available for a reliable LM Assist revenue-share comparison.";

      const otpFocusRow = otpRows.length ? otpRows[otpRows.length - 1] : DATA.otp.rows[DATA.otp.rows.length - 1];
      const otpAchievement = otpFocusRow && otpFocusRow.target2026 ? otpFocusRow.expectedRevenue / otpFocusRow.target2026 : null;
      document.getElementById("otpTarget").textContent = otpFocusRow ? euro.format(otpFocusRow.target2026) : "n/a";
      document.getElementById("otpTargetNote").textContent = otpFocusRow ? `${otpFocusRow.period} monthly target.` : "No OTP month available for the selected range.";
      document.getElementById("otpForecast").textContent = otpFocusRow ? euro.format(otpFocusRow.expectedRevenue) : "n/a";
      document.getElementById("otpForecast").className = `kpi ${otpFocusRow ? cls(otpFocusRow.gapToTarget) : "neutral"}`;
      document.getElementById("otpForecastNote").textContent = otpFocusRow ? `${otpFocusRow.period} expected revenue · ${pct.format(otpAchievement || 0)} of target · gap ${euro.format(otpFocusRow.gapToTarget)}.` : "No OTP forecast is available for the selected range.";

      document.getElementById("snapshotBudgetLoss").textContent = budget.lossPctVsActive == null ? "n/a" : pct.format(budget.lossPctVsActive);
      document.getElementById("snapshotBudgetLossNote").textContent = budget.lossPctVsActive == null
        ? "Offline listing exposure cannot be calculated from the current upload."
        : `${amount(budget.offlineListings, true)} offline listings versus ${amount(budget.listingBenchmark, true)} displayed live listings.`;
      document.getElementById("snapshotOfflineDealers").textContent = amount(budget.offlineDealers, true);
      document.getElementById("snapshotOfflineDealersNote").textContent = `${amount(budget.within3DaysOffline, true)} additional dealers expected within 3 days.`;
      document.getElementById("snapshotLmRevenue").textContent = money(DATA.lm.forecast.currentMonthRevenueForecast, true);
      document.getElementById("snapshotLmRevenueNote").textContent = `${amount(DATA.lm.forecast.currentMonthForecast, true)} projected handovers at EUR ${number.format(DATA.lm.forecast.assumedPricePerHandover)}.`;
      document.getElementById("snapshotOtpGap").textContent = otpFocusRow ? money(otpFocusRow.gapToTarget, true) : "n/a";
      document.getElementById("snapshotOtpGap").className = `snapshot-value ${otpFocusRow ? cls(otpFocusRow.gapToTarget) : "neutral"}`;
      document.getElementById("snapshotOtpGapNote").textContent = otpFocusRow
        ? `${otpFocusRow.period} expected revenue is ${pct.format(otpAchievement || 0)} of target.`
        : "No OTP month available for the selected range.";

      renderLmInsights(lmRows);
      renderOtpInsights(otpRows);
    }

    function exportExcel() {
      const lmRows = filterLmRows();
      const otpRows = filterOtpRows();
      const inactiveRows = filterInactiveLocationRows();
      const lmTableRows = lmRows.map(row => `<tr><td>${row.dateLabel}</td><td>${row.weekKey}</td><td>${row.brand}</td><td>${row.model}</td><td>${row.dealer}</td><td>${row.leadId}</td><td>${row.provision}</td><td>${row.status}</td></tr>`).join("");
      const otpTableRows = otpRows.map((row, index) => {
        const currentValue = row.expectedRevenue || row.actual2026 || 0;
        const previous = otpRows.slice(0, index).reverse().find(item => (item.expectedRevenue || item.actual2026 || 0) > 0);
        const previousValue = previous ? (previous.expectedRevenue || previous.actual2026 || 0) : 0;
        const mom = previous && currentValue > 0 && previousValue > 0 ? (currentValue / previousValue - 1) : "";
        return `<tr><td>${row.period}</td><td>${row.actual2026}</td><td>${mom}</td><td>${row.expectedRevenue ?? ""}</td><td>${row.target2026}</td><td>${row.actual2025}</td><td>${row.gapToTarget ?? ""}</td></tr>`;
      }).join("");
      const inactiveTableRows = inactiveRows.map(row => `<tr><td>${row.label}</td><td>${row.activeLocations}</td><td>${row.newlyInactive}</td><td>${row.newlyActivated}</td><td>${row.netLocationChange}</td><td>${row.inactiveShare ?? ""}</td></tr>`).join("");
      const html = `
        <html><head><meta charset="utf-8"></head><body>
        <table border="1">
          <tr><th colspan="8">LM Assist filtered records</th></tr>
          <tr><th>Date</th><th>Week</th><th>Brand</th><th>Model</th><th>Dealer</th><th>Lead ID</th><th>Provision</th><th>Status</th></tr>
          ${lmTableRows}
        </table>
        <br/>
        <table border="1">
          <tr><th colspan="7">OTP monthly data within the selected range</th></tr>
          <tr><th>Period</th><th>Actual 2026</th><th>MoM</th><th>Expected Revenue</th><th>Target 2026</th><th>Actual 2025</th><th>Gap vs Target</th></tr>
          ${otpTableRows}
        </table>
        <br/>
        <table border="1">
          <tr><th colspan="6">Inactive Dealer Locations monthly data within the selected range</th></tr>
          <tr><th>Month</th><th>Active Locations</th><th>Newly Inactive</th><th>Newly Activated</th><th>Net Location Change</th><th>Inactive Share</th></tr>
          ${inactiveTableRows}
        </table>
        </body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "management-wow-export.xls";
      a.click();
      URL.revokeObjectURL(url);
    }

    if (!window.html2canvas) {
      window.html2canvas = function() {
        return Promise.reject(new Error("PowerPoint export library is unavailable. Please regenerate the dashboard."));
      };
    }

    const PPT_EXPORT_AREAS = {
      "executive-snapshot": {
        title: "Executive KPI Snapshot",
        subtitle: "Top management KPIs in a slide-ready 16:9 layout.",
        selector: "#executiveSnapshot"
      },
      "search-result": {
        title: "Search / Dynamic Comparison Result",
        subtitle: "Selected dynamic comparison result from the executive search.",
        selector: "#executiveSearchResult",
        requiresVisible: true,
        missingMessage: "Please run a dynamic comparison first, then export the search result."
      },
      "search-kpis": {
        title: "Search / Dynamic Comparison KPI Cards",
        subtitle: "Compact KPI cards from the selected executive search comparison.",
        selector: "#executiveSearchResult .compare-summary",
        requiresVisible: true,
        missingMessage: "Please run a dynamic comparison first, then export the KPI cards."
      },
      "search-table": {
        title: "Search / Dynamic Comparison Table",
        subtitle: "Compact comparison table from the selected executive search result.",
        selector: "#executiveSearchResult .table-wrap",
        requiresVisible: true,
        missingMessage: "Please run a comparison with at least two periods first, then export the table."
      },
      "budget-kpis": {
        title: "Budget KPI Group",
        subtitle: "Budget-driven marketplace exposure and short-term dealer risk.",
        selector: "#budgetKpiGroup"
      },
      "inactive-kpis": {
        title: "Inactive Dealer Locations KPI Group",
        subtitle: "Dealer location churn, reactivation and 3-month directional forecast.",
        selector: "#inactiveKpiGroup"
      },
      "lm-kpis": {
        title: "LM Assist KPI Group",
        subtitle: "Current handover momentum and projected revenue.",
        selector: "#lmKpiGroup"
      },
      "otp-kpis": {
        title: "OTP KPI Group",
        subtitle: "Monthly OTP target and expected revenue outcome.",
        selector: "#otpKpiGroup"
      },
      "budget-chart": {
        title: "Budget: Listings vs Leads",
        subtitle: "Longtail and Deal listings with related lead volume in the currently selected chart mode.",
        selector: "#budgetRevenuePanel"
      },
      "inactive-trend": {
        title: "Inactive Dealer Locations Trend",
        subtitle: "Monthly inactive location share, active-base context and location movement.",
        selector: "#inactiveLocationsTrendSection"
      },
      "lm-trend": {
        title: "LM Assist Trend View",
        subtitle: "Selected LM Assist trend view and leading brand distribution.",
        selector: "#lmTrendSection"
      },
      "monthly-details": {
        title: "Monthly Detail Tables",
        subtitle: "LM Assist and OTP monthly detail tables in compact slide format.",
        selector: "#monthlyDetailsSection"
      }
    };

    function slugExportName(value) {
      return normalizeCommandText(value)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 90) || "dashboard-export";
    }

    function escapeHtml(value) {
      const entityMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      return String(value ?? "").replace(/[&<>"']/g, char => entityMap[char] || char);
    }

    function buildBudgetExportNode() {
      const mode = getBudgetChartMode();
      const modeLabel = mode === "mom" ? "Monthly average" : mode === "wow" ? "Weekly average" : "Daily view";
      const series = aggregateMarketSeries(filterMarketDailyRows(), mode);
      const chartConfigs = [
        {
          title: "Longtail Listings vs Leads",
          listingKey: "longtailListings",
          leadKey: "longtailLeads",
          listingLabel: "Longtail Listings",
          leadLabel: "Longtail Leads",
          colorListings: "#007AC5",
          colorLeads: "#59D7BB"
        },
        {
          title: "Deal Listings vs Deal Leads",
          listingKey: "dealListings",
          leadKey: "dealLeads",
          listingLabel: "Deal Listings",
          leadLabel: "Deal Leads",
          colorListings: "#000000",
          colorLeads: "#97D7FE"
        }
      ];

      function metricValue(item, key) {
        const value = item?.[key];
        return value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
      }

      function formatMetricValue(value) {
        return value === null || value === undefined || !Number.isFinite(Number(value)) ? "n/a" : amount(Math.round(value), value >= 1000);
      }

      function visibleRows(config) {
        return series.filter(item => metricValue(item, config.listingKey) !== null || metricValue(item, config.leadKey) !== null);
      }

      function pointPath(points) {
        return points.map((point, idx) => `${idx ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
      }

      function budgetSvg(rows, config) {
        const width = 700;
        const height = 190;
        const margin = { top: 30, right: 26, bottom: 34, left: 40 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;
        const listingRows = rows.filter(item => metricValue(item, config.listingKey) !== null);
        const leadRows = rows.filter(item => metricValue(item, config.leadKey) !== null);
        const maxListings = Math.max(...listingRows.map(item => metricValue(item, config.listingKey)), 1);
        const maxLeads = Math.max(...leadRows.map(item => metricValue(item, config.leadKey)), 1);
        const stepX = innerW / Math.max(rows.length - 1, 1);
        const makePoints = (key, maxValue) => rows.map((item, idx) => {
          const value = metricValue(item, key);
          if (value === null) return null;
          return {
            x: margin.left + stepX * idx,
            y: margin.top + innerH - (value / maxValue) * innerH,
            value,
            label: item.label,
            idx
          };
        }).filter(Boolean);
        const listingPoints = makePoints(config.listingKey, maxListings);
        const leadPoints = makePoints(config.leadKey, maxLeads);
        const lastListing = listingPoints[listingPoints.length - 1];
        const lastLead = leadPoints[leadPoints.length - 1];
        const tickCount = Math.min(5, rows.length);
        const tickIndexes = new Set(Array.from({ length: tickCount }, (_, idx) => Math.round((idx * (rows.length - 1)) / Math.max(tickCount - 1, 1))));
        const grids = [0, 1, 2, 3].map(idx => {
          const y = margin.top + (innerH / 3) * idx;
          return `<line x1="${margin.left}" y1="${y.toFixed(1)}" x2="${width - margin.right}" y2="${y.toFixed(1)}" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>`;
        }).join("");
        const ticks = rows.map((item, idx) => {
          if (!tickIndexes.has(idx)) return "";
          const x = margin.left + stepX * idx;
          return `<text x="${x.toFixed(1)}" y="${height - 10}" text-anchor="middle" fill="rgba(0,0,0,0.62)" font-size="11">${escapeHtml(item.label.replace("202", "'"))}</text>`;
        }).join("");
        const listingPath = listingPoints.length > 1 ? `<path d="${pointPath(listingPoints)}" fill="none" stroke="${config.colorListings}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : "";
        const leadPath = leadPoints.length > 1 ? `<path d="${pointPath(leadPoints)}" fill="none" stroke="${config.colorLeads}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : "";
        const listingDots = listingPoints.map(point => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.8" fill="${config.colorListings}"/>`).join("");
        const leadDots = leadPoints.map(point => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.8" fill="${config.colorLeads}"/>`).join("");
        let listingLabelY = lastListing ? Math.max(lastListing.y - 10, 16) : 0;
        let leadLabelY = lastLead ? Math.min(lastLead.y + 18, height - margin.bottom + 8) : 0;
        if (lastListing && lastLead && Math.abs(listingLabelY - leadLabelY) < 18) {
          leadLabelY = Math.min(leadLabelY + 14, height - margin.bottom + 18);
        }
        const labels = [
          lastListing ? `<text x="${Math.min(lastListing.x + 4, width - margin.right)}" y="${listingLabelY.toFixed(1)}" text-anchor="end" fill="${config.colorListings}" font-size="13" font-weight="700">${formatMetricValue(lastListing.value)}</text>` : "",
          lastLead ? `<text x="${Math.min(lastLead.x + 4, width - margin.right)}" y="${leadLabelY.toFixed(1)}" text-anchor="end" fill="${config.colorLeads}" font-size="13" font-weight="700">${formatMetricValue(lastLead.value)}</text>` : ""
        ].join("");
        const emptyState = rows.length ? "" : `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="rgba(0,0,0,0.62)" font-size="13">No data in selected range</text>`;
        return `
          <svg class="budget-export-chart" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(config.title)}">
            <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>
            <text x="${margin.left}" y="17" fill="${config.colorListings}" font-size="13" font-weight="700">${escapeHtml(config.listingLabel)}</text>
            <text x="${margin.left + 185}" y="17" fill="${config.colorLeads}" font-size="13" font-weight="700">${escapeHtml(config.leadLabel)}</text>
            ${grids}
            ${listingPath}
            ${leadPath}
            ${listingDots}
            ${leadDots}
            ${labels}
            ${ticks}
            ${emptyState}
          </svg>
        `;
      }

      function budgetTable(rows, config) {
        const maxRows = mode === "mom" ? 18 : mode === "wow" ? 12 : 12;
        const tableRows = rows.length <= maxRows ? rows : rows.slice(-maxRows);
        const body = tableRows.length ? tableRows.map(item => {
          const listings = metricValue(item, config.listingKey);
          const leads = metricValue(item, config.leadKey);
          const rate = listings && leads !== null ? leads / listings : null;
          return `
            <tr>
              <td>${escapeHtml(item.label)}</td>
              <td>${formatMetricValue(listings)}</td>
              <td>${formatMetricValue(leads)}</td>
              <td>${ratio(rate)}</td>
            </tr>
          `;
        }).join("") : `<tr><td colspan="4">No matching data</td></tr>`;
        return `
          <table class="budget-export-table">
            <thead><tr><th>Period</th><th>Listings</th><th>Leads</th><th>Lead Rate</th></tr></thead>
            <tbody>${body}</tbody>
          </table>
        `;
      }

      const dealCoverage = series.filter(item => metricValue(item, "dealListings") !== null).length;
      const panel = document.createElement("div");
      panel.className = "budget-export-panel";
      panel.innerHTML = `
        <div class="budget-export-heading">
          <h2>Budget: Listings vs Leads</h2>
          <div class="budget-export-badge">${escapeHtml(modeLabel)} · ${number.format(series.length)} periods</div>
        </div>
        <div class="budget-export-grid">
          ${chartConfigs.map(config => {
            const rows = visibleRows(config);
            return `
              <div class="budget-export-card">
                <h3>${escapeHtml(config.title)}</h3>
                ${budgetSvg(rows, config)}
                ${budgetTable(rows, config)}
              </div>
            `;
          }).join("")}
        </div>
        <div class="budget-export-footnote">Deal-listing coverage: ${number.format(dealCoverage)} of ${number.format(series.length)} visible periods include snapshot data. Missing Deal Listing values are intentionally shown as n/a instead of shrinking the selected date range.</div>
      `;
      return panel;
    }

    function replaceCanvasWithImages(clonedNode, sourceNode) {
      const clonedCanvases = Array.from(clonedNode.querySelectorAll("canvas"));
      const sourceCanvases = Array.from(sourceNode.querySelectorAll("canvas"));
      clonedCanvases.forEach((canvas, index) => {
        const sourceCanvas = sourceCanvases[index];
        if (!sourceCanvas) return;
        try {
          const image = document.createElement("img");
          image.src = sourceCanvas.toDataURL("image/png");
          image.className = "chart-export-image";
          image.alt = canvas.getAttribute("aria-label") || "Dashboard chart";
          image.style.width = "100%";
          image.style.height = `${sourceCanvas.clientHeight || 380}px`;
          image.style.objectFit = "contain";
          canvas.replaceWith(image);
        } catch (error) {
          const fallback = document.createElement("div");
          fallback.className = "chart-export-fallback";
          fallback.textContent = "Chart could not be embedded in the PNG export because the browser blocked canvas access.";
          canvas.replaceWith(fallback);
        }
      });
    }

    function prepareExportNode(areaKey) {
      const config = PPT_EXPORT_AREAS[areaKey] || PPT_EXPORT_AREAS["executive-snapshot"];
      const sourceNode = document.querySelector(config.selector);
      if (!sourceNode) throw new Error(config.missingMessage || "The selected export area is not available.");
      if (config.requiresVisible && (sourceNode.hidden || !sourceNode.textContent.trim())) {
        throw new Error(config.missingMessage || "Please run a dynamic comparison first, then export the search result.");
      }

      const stage = document.getElementById("pptExportStage");
      stage.innerHTML = "";
      const frame = document.createElement("div");
      frame.className = "ppt-export-frame";

      const content = document.createElement("div");
      content.className = `ppt-compact ppt-area-${areaKey}`;
      if (areaKey === "budget-chart") {
        content.appendChild(buildBudgetExportNode());
      } else {
        const clone = sourceNode.cloneNode(true);
        clone.removeAttribute("id");
        clone.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
        replaceCanvasWithImages(clone, sourceNode);
        content.appendChild(clone);
      }
      frame.appendChild(content);
      stage.appendChild(frame);
      return { frame, config };
    }

    function fitPptFrame(frame) {
      const content = frame.querySelector(".ppt-compact");
      if (!content) return;
      content.style.transform = "none";
      content.style.width = "100%";
      const maxWidth = content.classList.contains("ppt-area-budget-chart") ? 1300 : 1500;
      const maxHeight = content.classList.contains("ppt-area-budget-chart") ? 760 : 920;
      const widthScale = maxWidth / Math.max(content.scrollWidth, 1);
      const heightScale = maxHeight / Math.max(content.scrollHeight, 1);
      const scale = Math.min(1, widthScale, heightScale);
      content.style.transform = `scale(${scale})`;
      content.style.width = `${100 / scale}%`;
      frame.style.width = `${Math.ceil(Math.min(maxWidth, content.scrollWidth * scale) + 20)}px`;
      frame.style.height = `${Math.ceil(content.scrollHeight * scale + 20)}px`;
    }

    async function downloadPptPng(areaKey) {
      const button = document.getElementById("pptExportButton");
      const originalLabel = button.textContent;
      try {
        button.disabled = true;
        button.textContent = "Creating PNG...";
        const { frame, config } = prepareExportNode(areaKey);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        fitPptFrame(frame);
        await new Promise(resolve => requestAnimationFrame(resolve));
        const exportWidth = Math.ceil(frame.getBoundingClientRect().width);
        const exportHeight = Math.ceil(frame.getBoundingClientRect().height);
        const canvas = await window.html2canvas(frame, {
          width: exportWidth,
          height: exportHeight,
          scale: 1,
          backgroundColor: "#ffffff",
          foreignObjectRendering: false,
          useCORS: true,
          allowTaint: false,
          logging: false,
          windowWidth: Math.max(1500, exportWidth),
          windowHeight: Math.max(900, exportHeight)
        });
        const link = document.createElement("a");
        const dateStamp = new Date().toISOString().slice(0, 10);
        link.download = `management-dashboard-${slugExportName(config.title)}-${dateStamp}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (error) {
        alert(error.message || "PowerPoint export failed. Please try a different section.");
      } finally {
        document.getElementById("pptExportStage").innerHTML = "";
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }

    function init() {
      ensureLmTrendControls();
      setSelectedMode("mom");
      setBudgetChartMode("mom");
      const end = DATA.lm.maxDate;
      const [year, month] = end.split("-").map(Number);
      const startMonth = month === 1 ? 12 : month - 1;
      const startYear = month === 1 ? year - 1 : year;
      const start = `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
      document.getElementById("startDate").value = start;
      document.getElementById("endDate").value = end;
      document.getElementById("startPicker").addEventListener("click", () => document.getElementById("startDate").showPicker?.());
      document.getElementById("endPicker").addEventListener("click", () => document.getElementById("endDate").showPicker?.());
      document.getElementById("applyFilter").addEventListener("click", updateView);
      document.getElementById("exportExcel").addEventListener("click", exportExcel);
      document.getElementById("pptExportButton").addEventListener("click", () => {
        downloadPptPng(document.getElementById("pptExportArea").value);
      });
      document.getElementById("executiveSearchButton").addEventListener("click", runExecutiveSearch);
      document.getElementById("executiveSearchInput").addEventListener("keydown", event => {
        if (event.key === "Enter") runExecutiveSearch();
      });
      document.querySelectorAll(".command-chip").forEach(button => {
        button.addEventListener("click", () => {
          document.getElementById("executiveSearchInput").value = button.dataset.query || "";
          runExecutiveSearch();
        });
      });
      document.getElementById("lmInsightButton").addEventListener("click", () => renderLmInsights(filterLmRows()));
      document.getElementById("otpInsightButton").addEventListener("click", () => renderOtpInsights(filterOtpRows()));
      document.getElementById("dailyMode").addEventListener("click", () => { setSelectedMode("daily"); updateView(); });
      document.getElementById("wowMode").addEventListener("click", () => { setSelectedMode("wow"); updateView(); });
      document.getElementById("momMode").addEventListener("click", () => { setSelectedMode("mom"); updateView(); });
      document.getElementById("budgetDailyMode").addEventListener("click", () => { setBudgetChartMode("daily"); updateView(); });
      document.getElementById("budgetWowMode").addEventListener("click", () => { setBudgetChartMode("wow"); updateView(); });
      document.getElementById("budgetMomMode").addEventListener("click", () => { setBudgetChartMode("mom"); updateView(); });
      updateView();
    }

    window.addEventListener("resize", () => {
      if (DATA) updateView();
    });

    async function loadDashboardData(cacheBust = false) {
      const response = await fetch(`data.json${cacheBust ? `?v=${Date.now()}` : ""}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load data.json (${response.status})`);
      DATA = await response.json();
      document.querySelectorAll(".status-pill").forEach(pill => {
        pill.textContent = DATA.generatedAt ? `Updated · ${DATA.generatedAt}` : pill.textContent;
      });
      init();
    }

    loadDashboardData().catch(error => {
      console.error(error);
      document.body.innerHTML = `<main class="page"><section class="panel"><h1>Dashboard data could not be loaded</h1><p class="note">The website needs <code>data.json</code> next to <code>index.html</code>. If you opened this file directly from Finder, open it through GitHub Pages or a local web server instead.</p></section></main>`;
    });
