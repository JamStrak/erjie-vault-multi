import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  addEntries, assertBook, contributionShares, emptyBook, fundingPlan, getPeople,
  newEntry, normalizeLegacyFundingReviews, summarize, updateSettings,
} from '../ledger.js';

test('new books have a generic name; existing v1 and v2 books keep the earlier branded name', () => {
  const fresh = emptyBook();
  assert.equal(fresh.settings.businessName, '我的小生意');
  assert.equal(fresh.settings.capitalShares, null);
  const oldV1 = JSON.parse(readFileSync(new URL('./empty-book.json', import.meta.url), 'utf8'));
  const oldV2 = { ...structuredClone(fresh), settings: { names: fresh.settings.names, plannedPurchaseCents: 0, reserveCents: 0 } };
  for (const old of [oldV1, oldV2]) {
    const { book, changed, businessNameChanged, capitalSharesChanged } = normalizeLegacyFundingReviews(old);
    assert.equal(changed, true);
    assert.equal(businessNameChanged, true);
    assert.equal(capitalSharesChanged, true);
    assert.equal(book.settings.businessName, '二姐杂货铺');
    assert.equal(book.settings.capitalShares, null);
    assert.doesNotThrow(() => assertBook(book));
  }
});

test('business name edits are stored with the book and cannot corrupt it', () => {
  const book = updateSettings(emptyBook(), { businessName: '  阿青的手作店  ' });
  assert.equal(book.settings.businessName, '阿青的手作店');
  assert.throws(() => updateSettings(book, { businessName: '' }), /生意名称/);
  assert.throws(() => updateSettings(book, { businessName: '换行\n危险' }), /生意名称/);
  assert.throws(() => updateSettings(book, { businessName: '长'.repeat(25) }), /生意名称/);
});

test('custom contribution ratios guide catch-up and remaining funding without changing ledger profit', () => {
  let book = updateSettings(emptyBook(), {
    names: { me: '甲', partner: '乙', person_3: '丙' },
    capitalShares: { me: 5000, partner: 3000, person_3: 2000 },
    plannedPurchaseCents: 25000,
  });
  book = addEntries(book, [newEntry('deposit', 10000, { person: 'me' })]);
  let plan = fundingPlan(book);
  assert.deepEqual(plan.shareBps, { me: 5000, partner: 3000, person_3: 2000 });
  assert.equal(plan.shareMode, 'custom');
  assert.deepEqual(plan.equalizeByPersonCents, { me: 0, partner: 6000, person_3: 4000 });
  assert.deepEqual(plan.additionalByPersonCents, { me: 2500, partner: 1500, person_3: 1000 });
  assert.deepEqual(plan.dueCents, { me: 2500, partner: 7500, person_3: 5000 });
  const beforeProfit = summarize(book.entries, getPeople(book)).profitCents;
  for (const person of getPeople(book)) book = addEntries(book, [newEntry('deposit', plan.dueCents[person], { person })]);
  plan = fundingPlan(book);
  assert.deepEqual(plan.dueCents, { me: 0, partner: 0, person_3: 0 });
  assert.equal(book.entries.reduce((sum, entry) => sum + entry.amountCents, 0), 25000);
  assert.equal(summarize(book.entries, getPeople(book)).profitCents, beforeProfit);
});

test('custom ratios distribute single-cent gaps deterministically', () => {
  const book = updateSettings(emptyBook(), {
    names: { me: '甲', partner: '乙', person_3: '丙' },
    capitalShares: { me: 5000, partner: 3000, person_3: 2000 },
    reserveCents: 1,
  });
  assert.deepEqual(fundingPlan(book).dueCents, { me: 1, partner: 0, person_3: 0 });
});

test('contribution ratios reject partial, zero or non-100% targets, and require reset on roster changes', () => {
  const book = updateSettings(emptyBook(), { capitalShares: { me: 6000, partner: 4000 } });
  assert.deepEqual(contributionShares(book), { me: 6000, partner: 4000 });
  assert.throws(() => updateSettings(book, { capitalShares: { me: 10000, partner: 0 } }), /比例/);
  assert.throws(() => updateSettings(book, { capitalShares: { me: 5000 } }), /比例/);
  assert.throws(() => updateSettings(book, { capitalShares: { me: 5000, partner: 4000 } }), /比例/);
  assert.throws(() => updateSettings(book, { names: { ...book.settings.names, person_3: '丙' } }), /人数变化/);
  const expanded = updateSettings(book, { names: { ...book.settings.names, person_3: '丙' }, capitalShares: null });
  assert.deepEqual(contributionShares(expanded), { me: 3334, partner: 3333, person_3: 3333 });
  assert.equal(fundingPlan(expanded).shareMode, 'equal');
});
