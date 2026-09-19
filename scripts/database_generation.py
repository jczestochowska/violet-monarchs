import numpy as np
import pandas as pd

# Nom si initiale  = ID / admin
# Table = ID Table
# Activity = name Activity

#Global passwords
ANSWER_ENTER = "Violette"
ANSWER_MEMORY = "Lavande"
ANSWER_OSINT = "Boulingrin"
ANSWER_BINGO = "Atlas et Gaia"



df = pd.read_csv("data/guest_list.csv")

ListActivity = df.Activité.unique()
dictActivity = {}
dictActivity["Cours de cuisine traditionnelle"] = "cours de cuisine"
dictActivity["Croisière en voilier"] = "voilier"
dictActivity["Tour de vélo"] = "vélo"
dictActivity["Tour panoramique en train"] = "train"
dictActivity["Concert de musique locale"] = "musique"
dictActivity["Vol en parapente"] = "parapente"
dictActivity["Randonnée vers le sommet"] = "randonnée"
dictActivity["Descente à ski"] = "ski"
dictActivity["Rafting en eaux vives"] = "rafting"
dictActivity["Visite d’un musée"] = "musée"
dictActivity["Ascension en via ferrata"] = "via ferrata"
dictActivity["Nuit en bivouac"] = "bivouac"
dictActivity["Expérience photographique"] = "shooting"

dictBook = {}
dictBook[2] = "Provence"
dictBook[3] = "Suisse"
dictBook[4] = "Bristol"
dictBook[5] = "Vendée"
dictBook[6] = "Zurich"
dictBook[7] = "Thomery"
dictBook[8] = "Genève"
dictBook[9] = "Lausanne"
dictBook[10] = "Occitanie"
dictBook[11] = "Toulouse"
dictBook[12] = "Montréal"
dictBook[13] = "Antibes"
dictBook[14] = "Palaiseau"

dictPair = {}
uniQuePairs = df.Paire.unique()
for pair in uniQuePairs:
    try:
        dictPair[pair] = pair.split(" ")[0]
    except:
        print(f"Error processing pair: {pair}")

df["AnswerPAIR"] = df.Paire.map(dictPair)
df["AnswerMEMORY"] = ANSWER_MEMORY
df["AnswerOSINT"] = ANSWER_OSINT
df["AnswerBINGO"] = ANSWER_BINGO

df["AnswerBOOK"] = df.Table.map(dictBook)


df["AnswerVOLCANO"] = df.Activité.map(dictActivity)
print(df.iloc[-1])

df_final = df.copy()
df_final.to_csv("data/guest_list_final.csv", index=False)