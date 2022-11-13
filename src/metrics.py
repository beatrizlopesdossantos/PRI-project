### SETUP
import matplotlib.pyplot as plt
from sklearn.metrics import PrecisionRecallDisplay
import requests
import numpy as np
import pandas as pd

BOOSTED = False
QUERY_ID = "queries/q2"
QUERY_URL = "http://localhost:8983/solr/papers/select?defType=edismax&indent=true&q.op=OR&q=black%20hole&qf=link%20summary%20title%20authors%20date%20areas%20fields%20subjects&rows=100"

def precision(result, relevants):
    return len(set(result) & set(relevants)) / len(result)

def recall(result, relevants):
    return len(set(result) & set(relevants)) / len(relevants)

def f1(result, relevants):
    prec = precision(result, relevants)
    rec = recall(result, relevants)
    return 2 * prec * rec / (prec + rec)

def plot_precision_recall_curve(precision, recall, title):
    disp = PrecisionRecallDisplay(precision=precision, recall=recall)
    disp.plot(ax=plt.gca(), label="Precision-Recall curve")
    plt.xlabel("Recall")
    plt.ylabel("Precision")
    plt.title(title)
    plt.legend(loc="best")
    boosted_text = "boosted" if BOOSTED else ""
    plt.savefig("./" + QUERY_ID + "/" + boosted_text + 'results.pdf')


def plot_precision_recall_curve_from_df(df, title):
    precision = df["precision"].to_numpy()
    recall = df["recall"].to_numpy()
    average_precision = df["average_precision"].to_numpy()
    plot_precision_recall_curve(precision, recall, average_precision, title)

def main():
    result = requests.get(QUERY_URL).json()['response']['docs']
    result = set(map(lambda x: x['id'], result))
    relevants = list(map(lambda el: el.rstrip(), open("./" + QUERY_ID + "/relevants.txt").readlines()))
    
    precision_values = [precision(result, relevants[:i]) for i in range(1, len(relevants) + 1)]
    recall_values = [recall(result, relevants[:i]) for i in range(1, len(relevants) + 1)]
    f1_values = [f1(result, relevants[:i]) for i in range(1, len(relevants) + 1)]

    precision_recall_match = {k: v for k,v in zip(recall_values, precision_values)}

    # Extend recall_values to include traditional steps for a better curve (0.1, 0.2 ...)
    recall_values.extend([step for step in np.arange(0.1, 1.1, 0.1) if step not in recall_values])
    recall_values = sorted(set(recall_values))

    # Extend matching dict to include these new intermediate steps
    for idx, step in enumerate(recall_values):
        if step not in precision_recall_match:
            if recall_values[idx-1] in precision_recall_match:
                precision_recall_match[step] = precision_recall_match[recall_values[idx-1]]
            else:
                precision_recall_match[step] = precision_recall_match[recall_values[idx+1]]

    print("precision values: ", precision_values)
    print("recall values: ", recall_values)
    print("f1 values: ", f1_values)



    plot_precision_recall_curve([precision_recall_match.get(r) for r in recall_values], recall_values, title="Precision-Recall curve")





if __name__ == "__main__":
    main()
