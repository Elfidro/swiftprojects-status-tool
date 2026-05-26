// ==UserScript==
// @name         SwiftProjects Status Tool
// @namespace    https://github.com/Elfidro/swiftprojects-status-tool
// @version      1.14
// @author       Luigi Cortez
// @description  Bulk status updater for SwiftProjects — select tasks/requirements and apply statuses in one click. Supports shift-select, select-visible, and draggable panel.
// @homepageURL  https://github.com/Elfidro/swiftprojects-status-tool
// @supportURL   https://github.com/Elfidro/swiftprojects-status-tool/issues
// @updateURL    https://raw.githubusercontent.com/Elfidro/swiftprojects-status-tool/main/status-tool.user.js
// @downloadURL  https://raw.githubusercontent.com/Elfidro/swiftprojects-status-tool/main/status-tool.user.js
// @match        https://swiftprojects.io/*
// @grant        GM_addStyle
// ==/UserScript==

// ── Changelog ───────────────────────────────────────────────
// v1.14 — Select Invoice Requirements (Ontel / TECH-OPS)
//   - New "Select Invoice Reqs" button, auto-shown when project
//     name contains "TECH-OPS:"
//   - Selects all visible tasks with "invoice" in the name
//   - Excludes "Final COP Invoiced" from selection
//
// v1.13 — Select 360 overhaul
//   - Rewritten to use retain-list approach: selects all visible
//     requirements EXCEPT those that should be kept
//   - Supports both Sector and Landlord photo pages
//     (auto-detects from task header)
//   - Sector retain: unit status light, horizon, mount mods,
//     upconverter, ground equipment, 48hr reqs
//   - Landlord retain: top ten ft, access road, decom equip,
//     electrical meter, feedline sheath, point of array,
//     locked gate, monopole interior, mount height, packing slip
//   - Only selects visible items (matches Select Visible behavior)
//   - Button conditionally shown only on BAWA projects with
//     "Sector 360-degree Photos" milestone
//
// v1.12 — Shift-click multi-select
//   - Windows Explorer-style shift-click range selection
//     (anchor on regular click, shift-click selects/adjusts range)
//   - Global shift key tracking as fallback for shift detection
//   - Fixed click compatibility with Angular/Ionic
//     (removed mousedown/pointerdown handlers that broke clicks)
//
// v1.11 — Select 360 button
//   - Added Select 360 button with keyword-based task matching
//
// v1.10 — UI improvements
//   - Added version display in panel header
//
// v1.09 — Base version
//   - Select Visible, Apply Status, Clear Selection
//   - Draggable panel, checkbox injection, status pre-check
// ─────────────────────────────────────────────────────────────

(function () {
  'use strict';

  GM_addStyle(`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    .tm-panel {
      position: fixed;
      bottom: 24px;
      left: 300px;
      width: 180px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,.10), 0 1px 4px rgba(0,0,0,.06);
      z-index: 99999;
      user-select: none;
      overflow: hidden;
      transition: box-shadow 0.2s;
    }

    .tm-panel:hover {
      box-shadow: 0 8px 28px rgba(0,0,0,.13), 0 2px 6px rgba(0,0,0,.07);
    }

    .tm-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      cursor: move;
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    }

    .tm-icon {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(22,163,74,.4);
    }

    .tm-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 1px;
      flex: 1;
    }

    .tm-title {
      color: #f1f5f9;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.03em;
      line-height: 1;
    }

    .tm-version {
      color: #94a3b8;
      font-size: 9px;
      font-weight: 500;
      line-height: 1;
    }

    .tm-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #f59e0b;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 8px;
      display: none;
      line-height: 1.4;
      box-shadow: 0 1px 3px rgba(0,0,0,.2);
    }

    .tm-panel.minimized .tm-body {
      display: none;
    }

    .tm-body {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: #f8fafc;
    }

    .tm-body button {
      width: 100%;
      padding: 6px 0;
      border: none;
      border-radius: 7px;
      font-family: inherit;
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      transition: filter 0.15s, transform 0.1s;
    }

    .tm-body button:active {
      transform: scale(0.97);
    }

    #tm-select-visible {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
      box-shadow: 0 1px 4px rgba(37,99,235,.3);
    }

    #tm-select-visible:hover { filter: brightness(1.08); }

    #tm-select-360 {
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: #fff;
      box-shadow: 0 1px 4px rgba(124,58,237,.3);
      display: none;
    }

    #tm-select-360.tm-360-visible { display: block; }

    #tm-select-360:hover { filter: brightness(1.08); }

    #tm-select-invoice {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #fff;
      box-shadow: 0 1px 4px rgba(217,119,6,.3);
      display: none;
    }

    #tm-select-invoice.tm-invoice-visible { display: block; }

    #tm-select-invoice:hover { filter: brightness(1.08); }

    #tm-apply {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: #fff;
      box-shadow: 0 1px 4px rgba(22,163,74,.3);
    }

    #tm-apply:hover { filter: brightness(1.08); }

    #tm-clear {
      background: #fff;
      color: #64748b;
      border: 1px solid #e2e8f0 !important;
    }

    #tm-clear:hover {
      background: #f1f5f9;
      color: #334155;
    }

    .tm-body select {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      font-family: inherit;
      font-size: 11.5px;
      font-weight: 500;
      color: #334155;
      background: #fff;
      cursor: pointer;
      outline: none;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%2394a3b8' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 8px center;
      padding-right: 24px;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }

    .tm-body select:focus {
      border-color: #3b82f6;
    }

    .tm-divider {
      height: 1px;
      background: #e2e8f0;
      margin: 2px 0;
    }

    .tm-select-box {
      width: 22px;
      height: 22px;
      border: 2px solid #94a3b8;
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      user-select: none;
      position: absolute;
      top: 25%;
      left: -34px;
      z-index: 2147483647;
      border-radius: 5px;
      transition: background 0.12s, border-color 0.12s;
    }

    .tm-select-box:hover {
      border-color: #1e293b;
    }

    .tm-select-box.selected {
      background: #fff;
      border-color: #1e293b;
      color: #1e293b;
    }
  `);

  const panel = document.createElement('div');
  panel.className = 'tm-panel minimized';
  panel.innerHTML = `
    <div class="tm-header">
      <div class="tm-icon" id="tm-toggle">
        ✓
        <div class="tm-badge" id="tm-badge">0</div>
      </div>
      <div class="tm-title-wrap">
        <div class="tm-title">Status Tool</div>
        <div class="tm-version">v1.14</div>
      </div>
    </div>
    <div class="tm-body">
      <button id="tm-select-visible">Select Visible</button>
      <button id="tm-select-360">Select 360</button>
      <button id="tm-select-invoice">Select Invoice Reqs</button>
      <div class="tm-divider"></div>
      <select id="tm-status">
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
        <option value="in_progress">In Progress</option>
        <option value="submitted">Submitted</option>
        <option value="rejected">Rejected</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <button id="tm-apply">Apply Status</button>
      <button id="tm-clear">Clear Selection</button>
    </div>
  `;
  document.body.appendChild(panel);

  const badge = document.getElementById('tm-badge');

  document.getElementById('tm-toggle').onclick = () =>
    panel.classList.toggle('minimized');

  let dragging = false, ox = 0, oy = 0;

  panel.querySelector('.tm-header').addEventListener('mousedown', e => {
    dragging = true;
    ox = e.clientX - panel.offsetLeft;
    oy = e.clientY - panel.offsetTop;
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    panel.style.left = `${e.clientX - ox}px`;
    panel.style.top = `${e.clientY - oy}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', () => dragging = false);

  let lastClickedIndex = null;
  let lastShiftRange = null;
  let shiftHeld = false;
  document.addEventListener('keydown', e => { if (e.key === 'Shift') shiftHeld = true; }, true);
  document.addEventListener('keyup', e => { if (e.key === 'Shift') shiftHeld = false; }, true);

  function getAllItems() {
    return [...document.querySelectorAll('.BaseListItem.ProjectLayout__content__item')];
  }

  function updateBadge() {
    const count = getAllItems().filter(i => i.dataset.tmSelected === 'true').length;
    badge.textContent = count;
    badge.style.display = count ? 'block' : 'none';
  }

  function setSelected(item, state) {
    item.dataset.tmSelected = state ? 'true' : 'false';
    const box = item.querySelector('.tm-select-box');
    if (box) {
      box.classList.toggle('selected', state);
      box.textContent = state ? '✓' : '';
    }
  }

  function handleClick(e, item) {
      e.preventDefault();
      e.stopPropagation();

      const items = getAllItems();
      const index = items.indexOf(item);
      if (index === -1) return;

      if ((e.shiftKey || shiftHeld) && lastClickedIndex !== null) {
          const start = Math.min(lastClickedIndex, index);
          const end = Math.max(lastClickedIndex, index);

          if (lastShiftRange) {
              for (let i = lastShiftRange.start; i <= lastShiftRange.end; i++) {
                  if (i < start || i > end) setSelected(items[i], false);
              }
          }

          for (let i = start; i <= end; i++) {
              setSelected(items[i], true);
          }

          lastShiftRange = { start, end };
      } else {
          const newState = item.dataset.tmSelected !== 'true';
          setSelected(item, newState);
          lastClickedIndex = index;
          lastShiftRange = null;
      }

      updateBadge();
  }

  function inject(item) {
    if (item.dataset.tmInjected) return;
    item.dataset.tmInjected = 'true';
    item.dataset.tmSelected = 'false';
    item.style.position = 'relative';

    const box = document.createElement('div');
    box.className = 'tm-select-box';
    box.addEventListener('click', e => handleClick(e, item));

    const task = item.querySelector('.TaskCard');
    const req = item.querySelector(':scope > .RequirementItem');

    if (task) task.appendChild(box);
    else if (req) item.insertBefore(box, req);
  }

  function check360Visibility() {
    const btn = document.getElementById('tm-select-360');
    if (!btn) return;
    const milestones = document.querySelectorAll('.MilestoneItem__name');
    const has360 = [...milestones].some(m => m.textContent.includes('Sector 360-degree Photos'));
    btn.classList.toggle('tm-360-visible', has360);
  }

  function checkInvoiceVisibility() {
    const btn = document.getElementById('tm-select-invoice');
    if (!btn) return;
    const header = document.querySelector('.ProjectViewBanner__headerLabel');
    const isTechOps = header && header.textContent.includes('TECH-OPS:');
    btn.classList.toggle('tm-invoice-visible', !!isTechOps);
  }

  function scan() {
    getAllItems().forEach(inject);
    check360Visibility();
    checkInvoiceVisibility();
  }

  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });

  document.getElementById('tm-select-visible').onclick = () => {
    getAllItems().forEach(item => {
      const rect = item.getBoundingClientRect();
      const isRendered = rect.width > 0 && rect.height > 0 && item.offsetParent !== null;
      if (isRendered) setSelected(item, true);
    });
    updateBadge();
    lastClickedIndex = null;
  };

  const SECTOR_NAMES = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'];

  const SECTOR_RETAIN = [
    'unit status light',
    'horizon',
    'mount mod',
    'upconverter',
    'ground equipment',
    '48hr', '48 hr', '48-hr'
  ];

  const LL_RETAIN = [
    'top ten ft',
    'access road',
    'decom',
    'electrical meter',
    'feedline sheath',
    'point of array',
    'locked gate',
    'monopole interior',
    'mount height',
    'packing slip'
  ];

  function getTaskName(item) {
      // Try multiple selectors in order of preference
      let titleEl = item.querySelector('.TaskCard__title');
      if (!titleEl) titleEl = item.querySelector('.RequirementItem__title');
      if (!titleEl) titleEl = item.querySelector('.RequirementItem h2');
      if (!titleEl) titleEl = item.querySelector('h2');

      return titleEl ? titleEl.textContent.trim() : '';
  }

  document.getElementById('tm-select-360').onclick = () => {
    const header = document.querySelector('.TaskViewBanner__headerLabel');
    if (!header) {
      alert('Open a Sector or Landlord Photos task first');
      return;
    }
    const headerText = header.textContent.trim().toLowerCase();

    let retainKeywords;
    if (SECTOR_NAMES.some(s => headerText.startsWith(s))) {
      retainKeywords = SECTOR_RETAIN;
    } else if (headerText.startsWith('landlord')) {
      retainKeywords = LL_RETAIN;
    } else {
      alert('Select 360 only works on Sector or Landlord Photos tasks');
      return;
    }

    let selectedCount = 0;
    getAllItems().forEach(item => {
      const rect = item.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && item.offsetParent !== null;
      if (!isVisible) return;
      const name = getTaskName(item).toLowerCase();
      if (!retainKeywords.some(kw => name.includes(kw))) {
        setSelected(item, true);
        selectedCount++;
      }
    });
    updateBadge();
    lastClickedIndex = null;
    if (selectedCount === 0) alert('No tasks to select on this page');
  };

  document.getElementById('tm-select-invoice').onclick = () => {
    let selectedCount = 0;
    getAllItems().forEach(item => {
      const rect = item.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && item.offsetParent !== null;
      if (!isVisible) return;
      const name = getTaskName(item).toLowerCase();
      if (name.includes('invoice') && !name.includes('final cop invoiced')) {
        setSelected(item, true);
        selectedCount++;
      }
    });
    updateBadge();
    lastClickedIndex = null;
    if (selectedCount === 0) alert('No invoice tasks found on this page');
  };

  document.getElementById('tm-clear').onclick = () => {
    getAllItems().forEach(i => setSelected(i, false));
    updateBadge();
    lastClickedIndex = null;
  };

  // Use prefix-match selectors so both "status-approved" and "status-approved-active" are found
  const STATUS_SELECTORS = {
    approved:    '[class*="selector-item-status-approved"]',
    pending:     '[class*="selector-item-status-pending"]',
    submitted:   '[class*="selector-item-status-submitted"]',
    cancelled:   '[class*="selector-item-status-cancelled"]',
    in_progress: '[class*="selector-item-status-in_progress"]',
    rejected:    '[class*="selector-item-status-rejected"]'
  };

  const STATUS_LABELS = {
    approved: 'Approved',
    pending: 'Pending',
    submitted: 'Submitted',
    cancelled: 'Cancelled',
    in_progress: 'In Progress',
    rejected: 'Rejected'
  };

  const wait = ms => new Promise(r => setTimeout(r, ms));

  // Read the current status from the icon class (works on both Tasks and Requirements views)
  // Icon classes look like: status-approved-active, status-pending-active, status-rejected-active, etc.
  function getCurrentStatusFromIcon(row) {
    const icon = row.querySelector('.PopoverSelect.StatusSelector .PopoverSelect__icon');
    if (!icon) return '';
    const match = icon.className.match(/status-(\w+)-active/);
    if (match) return match[1]; // returns: approved, pending, submitted, cancelled, rejected, inprogress
    return '';
  }

  // Also check the label text as a fallback (Tasks view has .StatusSelector__label)
  function getCurrentStatusFromLabel(row) {
    const el = row.querySelector('.StatusSelector__label');
    return el ? el.textContent.trim() : '';
  }

  // Wait for any active popover backdrop to close (up to ~1s)
  async function waitForPopoverClose() {
    for (let i = 0; i < 20; i++) {
      if (!document.querySelector('.popover-backdrop.active')) return true;
      await wait(50);
    }
    return false;
  }

  // Dismiss the status popover by clicking its backdrop — lets ionic clean up its own state
  async function dismissPopover() {
    const backdrop = document.querySelector('.popover-backdrop.active');
    if (!backdrop) return;
    backdrop.click();
    await waitForPopoverClose();
  }

  async function setStatus(row, key) {
    // --- Pre-check: detect current status WITHOUT opening the popover ---
    // Method 1: Check icon class (reliable on both Tasks and Requirements views)
    const iconStatus = getCurrentStatusFromIcon(row);
    // Normalize: icon uses "inprogress" but key uses "in_progress"
    const normalizedIcon = iconStatus.replace('inprogress', 'in_progress');
    if (normalizedIcon === key) return 'skipped';

    // Method 2: Check label text (Tasks view fallback)
    const labelStatus = getCurrentStatusFromLabel(row);
    if (labelStatus && labelStatus === STATUS_LABELS[key]) return 'skipped';

    // --- Make sure no other popover is open before we open a new one ---
    await dismissPopover();

    const control = row.querySelector('.PopoverSelect.StatusSelector .PopoverSelect__content');
    if (!control) throw 'Status selector not found';

    ['mousedown','mouseup','click'].forEach(t =>
      control.dispatchEvent(new MouseEvent(t, { bubbles: true }))
    );

    let option;
    for (let i = 0; i < 30; i++) {
      option = document.querySelector(STATUS_SELECTORS[key]);
      if (option && option.offsetParent) break;
      await wait(100);
    }

    if (!option) {
      await dismissPopover();
      throw `Status ${key} not found`;
    }

    // Already active (class has -active suffix) — dismiss popover and skip
    if (option.className.includes(`selector-item-status-${key}-active`)) {
      await dismissPopover();
      return 'skipped';
    }

    // Disabled — can't change to this status from the current state
    if (option.className.includes('selector-item-status-disabled') || option.hasAttribute('disabled')) {
      await dismissPopover();
      return 'disabled';
    }

    ['mousedown','mouseup','click'].forEach(t =>
      option.dispatchEvent(new MouseEvent(t, { bubbles: true }))
    );

    // Wait for ionic to finish closing the popover after the selection
    await waitForPopoverClose();

    return 'changed';
  }

  async function runSequential(rows, key) {
    let changed = 0, skipped = 0, disabled = 0;

    for (const row of rows) {
      const result = await setStatus(row, key);
      if (result === 'changed') changed++;
      else if (result === 'skipped') skipped++;
      else if (result === 'disabled') disabled++;
      await wait(10);
    }

    return { changed, skipped, disabled };
  }

  document.getElementById('tm-apply').onclick = async () => {
    const key = document.getElementById('tm-status').value;
    const rows = getAllItems().filter(i => i.dataset.tmSelected === 'true');

    if (!rows.length) return alert('No items selected');

    try {
      const { changed, skipped, disabled } = await runSequential(rows, key);
      const parts = [];
      if (changed) parts.push(`${changed} changed`);
      if (skipped) parts.push(`${skipped} already ${STATUS_LABELS[key]}`);
      if (disabled) parts.push(`${disabled} disabled/unavailable`);
      alert(`Done — ${parts.join(', ')}`);
    } catch (e) {
      alert('Stopped: ' + e);
    }
  };

})();
