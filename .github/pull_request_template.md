## Summary

<!-- Why this change exists. One to three bullets. -->

## Test plan

- [ ] `npm test -- --run`
- [ ] `npm run build`
- [ ] If API usage changed: note BE impact or link paired PR in `crm-be`

## Checklist

- [ ] No unrelated changes in this PR
- [ ] HTTP calls go through feature `*Api.ts`, not raw axios in components
- [ ] No secrets committed
- [ ] Modal close / backdrop behaviour checked if UI touched
