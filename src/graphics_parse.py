import matplotlib.pyplot as plt

def piePlot(data, title, path):
    fig = plt.figure(figsize = (15, 10))

    plt.pie(data.values(), labels=data.keys(), autopct='%1.1f%%')
    plt.title(title, fontsize=20)
    plt.axis('equal')
    plt.savefig(path)
    plt.show()

def barPlot(data, title, xAxis, yAxis, path):
    fig = plt.figure(figsize = (20, 10))

    plt.bar(data.keys(), data.values(), color ='maroon', width = 0.4)
    plt.xlabel(xAxis)
    plt.ylabel(yAxis)
    plt.title(title, fontsize=20)
    plt.savefig(path)
    plt.show()

def splitString(string):
    if '["' in string:
        allAuthors = string.split('["')
        allAuthors = allAuthors[1].split('"]')
        allAuthors = allAuthors[0].split('", "')
    else:
        allAuthors = string.split("['")
        allAuthors = allAuthors[1].split("']")
        allAuthors = allAuthors[0].split("', '")

    return allAuthors

def checkExistance(dict, key):
    if key in dict:
        dict[key] += 1
    else:
        dict[key] = 1