---
name: orders-display-conventions
description: Frontend display format conventions for Orders page
---

## Order Item Display Standards

### Currency Format
- **Never** use `NT$` prefix or `$NT` suffix
- Use `元` suffix for all monetary amounts
- Examples: `8,800元`, `4,400元`, `12,999元`

### Preorder Label Display
- Pre-order items use a standard 2-4 week estimated range
- When a `promised_weeks` range exists (`promised_weeks_min`/`promised_weeks_max`): show as `預計2-4週`
- When only a single `promised_weeks` value exists: show as `預計3週` (single value, no duplication)
- Prefix with `預計` (estimated) to match the checkout success message
- Do not prefix with "代購" - the badge color/style already indicates pre-order status

### Amount Columns
- 總額, 訂金, 尾款, 應付金額 use the `元` format
- Subtotal/單價/小計 in item list also use `元` format

### Implementation Pattern
```jsx
// Date display with locale
new Date(item.created_at).toLocaleDateString('zh-TW')

// Currency display
{formatCurrency(amount)} // renders "X,XXX元"

// Preorder week range
<span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-purple-900/40 text-purple-300 border border-purple-700/40">
  {it.promised_weeks_min && it.promised_weeks_max
    ? `預計${it.promised_weeks_min}-${it.promised_weeks_max}週`
    : it.promised_weeks
    ? `預計${it.promised_weeks}週`
    : '代購')}
</span>
```

## Schema Requirements

To support preorder week ranges, the `OrderItem` and `ConsumerOrderItem` models need:
```prisma
promised_weeks_min   Int? @default(null)
promised_weeks_max   Int? @default(null)
```

Run `prisma migrate deploy` after schema changes to migrate.