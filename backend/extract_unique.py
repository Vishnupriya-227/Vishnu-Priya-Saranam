import pandas as pd
import json

# Load your dataset
df = pd.read_excel("Dataset.xlsx")

# Extract unique values (match column names exactly as in Excel)
degrees = df["Degree"].dropna().unique().tolist()
majors = df["Major"].dropna().unique().tolist()

# Skills might be comma-separated → flatten them
skills = []
for s in df["Skills"].dropna().tolist():
    for skill in str(s).split(","):
        skill = skill.strip()
        if skill and skill not in skills:
            skills.append(skill)

# Save to JSON
data = {
    "degrees": degrees,
    "majors": majors,
    "skills": skills,
}

with open("unique_values.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("✅ unique_values.json has been created successfully!")
