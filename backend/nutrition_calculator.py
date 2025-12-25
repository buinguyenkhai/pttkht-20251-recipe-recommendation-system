# backend/nutrition_calculator.py
import pandas as pd
from rapidfuzz import fuzz
import re
from utils import quantity_to_gram
from pathlib import Path

CSV_PATH = Path(__file__).parent / "Data" / "nutrition_final.csv"

def match_ingredient(raw_name):
    if not CSV_PATH.is_file():
        print(f"Error: Nutrition data file not found at {CSV_PATH}")
        return None, [0, 0, 0, 0]

    df = pd.read_csv(CSV_PATH, encoding='utf-8')
    nutrient_dict = {
        row['Name'].lower(): [float(row['Energy']), float(row['Protein']), float(row['Fat']), float(row['Carbohydrate'])]
        for _, row in df.iterrows()
    }

    raw_name_lower = raw_name.lower()
    best_match = None
    max_score = 0
    best_mean_score = 0

    for std_ing in nutrient_dict.keys():
        std_parts = [part.strip() for part in std_ing.split(" - ")]
        for part in std_parts:
            scores = [
                fuzz.ratio(raw_name_lower, part),
                fuzz.partial_ratio(raw_name_lower, part),
                fuzz.token_sort_ratio(raw_name_lower, part),
                fuzz.token_set_ratio(raw_name_lower, part)
            ]
            current_score = max(scores)
            mean_score = sum(scores) / len(scores)

            if current_score > max_score:
                max_score = current_score
                best_match = std_ing
                best_mean_score = mean_score
            elif current_score == max_score and mean_score > best_mean_score:
                best_match = std_ing
                best_mean_score = mean_score

    if max_score > 80 and best_match:
        return best_match, nutrient_dict[best_match]
    else:
        return None, [0, 0, 0, 0]

def parse_quantity_unit(text):
    if not isinstance(text, str):
        return 0, "g"
    pattern = r"^([\d,.]+)\s*(.+)$"
    match = re.match(pattern, text.strip())
    if match:
        quantity = float(match.group(1).replace(",", "."))
        unit = match.group(2).strip().lower()
        return quantity, unit
    else:
        try:
            return float(text.strip()), "g"
        except (ValueError, TypeError):
            return 0, "g"

def match_quantity(unit, quantity_map):
    best_match = unit
    max_score = 0
    for std_unit in quantity_map.keys():
        score = fuzz.ratio(unit, std_unit)
        if score > max_score:
            max_score = score
            best_match = std_unit
    if max_score > 80:
        return best_match, quantity_map[best_match]
    return None, 0

def normalize_quantity(quantity):
    amount, unit = parse_quantity_unit(quantity)
    match, values = match_quantity(unit, quantity_to_gram)
    return amount, amount * values / 100 if values > 0 else 0.01

def calculate_nutrition(ingredient_pair):
    _, nutrition_per_100g = match_ingredient(ingredient_pair[0])
    if nutrition_per_100g is None:
        return [0, 0, 0, 0]
        
    _, normalized_value = normalize_quantity(ingredient_pair[1])

    calories = nutrition_per_100g[0] * normalized_value
    protein = nutrition_per_100g[1] * normalized_value
    fat = nutrition_per_100g[2] * normalized_value
    carbs = nutrition_per_100g[3] * normalized_value

    return [calories, protein, fat, carbs]