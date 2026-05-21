# P&L Calculation Examples

Polaris stores realized P&L only for closed trades. Open trades keep `gross_pnl` and `net_pnl` as `null`.

## Formula

```text
long gross P&L = (exit price - entry price) * quantity
short gross P&L = (entry price - exit price) * quantity
net P&L = gross P&L - fees
```

## Examples

| Direction | Entry | Exit | Quantity | Fees | Gross P&L | Net P&L |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Long | 100 | 112 | 10 | 2 | 120 | 118 |
| Long | 100 | 94 | 10 | 2 | -60 | -62 |
| Short | 100 | 88 | 10 | 2 | 120 | 118 |
| Short | 100 | 106 | 10 | 2 | -60 | -62 |
