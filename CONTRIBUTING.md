# Contributing

Lumo is built by one person, with the rules of a team. Every change goes through a pull request, including docs.

## Workflow

1. **Start from an issue.** If there isn't one, open it first.
2. **Branch from `main`** as `type/short-name`:
   `feat/add-transaction`, `fix/budget-rounding`, `docs/sample-data`
3. **Open a PR** using the template. Link the issue with `Closes #N`.
4. **Review** your own diff against the self-review checklist, and run an automated code review.
5. **Squash and merge.** The PR title becomes the commit on `main`, and the branch is deleted.

## `main` is protected

- No direct pushes, for admins too
- A pull request is required
- Linear history (squash merges only)
- All review conversations must be resolved
- No force pushes or deletion

## PR titles: Conventional Commits

```
<type>: <what changes, lower case, no period>
```

| Type | Use for |
| --- | --- |
| `feat` | A new user-facing feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | Code change with no behavior change |
| `test` | Adding or fixing tests |
| `chore` | Tooling, config, dependencies |
| `ci` | CI workflows |

Example: `feat: add left to spend card`

## Definition of Done

A change is done when:

- [ ] It does what the issue asks, and nothing more
- [ ] Domain logic (money, dates, left to spend) has tests
- [ ] Money is stored and calculated in minor units, never floats
- [ ] All user-facing copy goes through i18n
- [ ] It is accessible: labels, 4.5:1 text contrast, 44px touch targets, Reduce Motion
- [ ] It works on a real iPhone and a real Android device (for UI changes)
- [ ] No user data leaves the device ([local-only](docs/mvp-scope.md))
- [ ] CI is green *(once CI exists)*

## Decisions

Product scope: [docs/mvp-scope.md](docs/mvp-scope.md). Sample data: [docs/sample-data.md](docs/sample-data.md). Architecture decisions will live in `docs/adr/`.
