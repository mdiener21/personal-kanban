import requests
import datetime
from tabulate import tabulate

# === CONFIG ===
GITHUB_TOKEN = "YOUR_TOKEN_HERE"
SEARCH_TERMS = "kanban+personal-kanban"
MAX_REPOS = 100  # we will trim to top 50 later

headers = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
}

# === SEARCH REPOS ===
search_url = "https://api.github.com/search/repositories"
params = {
    "q": f"{SEARCH_TERMS} in:name,description",
    "sort": "updated",
    "order": "desc",
    "per_page": MAX_REPOS
}

resp = requests.get(search_url, headers=headers, params=params)
resp.raise_for_status()
items = resp.json().get("items", [])

repos_data = []

for repo in items:
    # Skip if clearly not standalone kanban board
    # Example filters (can customize):
    if "plugin" in repo["name"].lower():
        continue
    if "project" in repo["name"].lower() and "kanban" not in repo["name"].lower():
        continue

    # Get languages
    langs_resp = requests.get(repo["languages_url"], headers=headers)
    languages = ", ".join(langs_resp.json().keys())

    # Get last commit
    commits_url = f"https://api.github.com/repos/{repo['full_name']}/commits"
    commits_resp = requests.get(commits_url, headers=headers, params={"per_page": 1})
    commits_resp.raise_for_status()
    commit_data = commits_resp.json()
    last_commit_date = commit_data[0]["commit"]["committer"]["date"] if commit_data else ""

    repos_data.append({
        "name": repo["full_name"],
        "languages": languages,
        "stars": repo["stargazers_count"],
        "license": repo["license"]["name"] if repo["license"] else "None",
        "last_commit": last_commit_date
    })

# Sort by last commit (most recent) then by stars
repos_data.sort(
    key=lambda x: (datetime.datetime.fromisoformat(x["last_commit"].replace("Z", "")), x["stars"]),
    reverse=True
)

# Trim to max 50
repos_data = repos_data[:50]

# === OUTPUT Markdown Table ===
table = []
for r in repos_data:
    table.append([
        r["name"],
        r["languages"],
        r["stars"],
        r["license"],
        r["last_commit"]
    ])

print(tabulate(table, headers=[
    "repo-name",
    "repo-languages",
    "number-of-stars",
    "license-name",
    "last-commit-date"
], tablefmt="github"))
