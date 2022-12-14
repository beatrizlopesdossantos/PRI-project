const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;

const c = console;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

const solr = axios.create({
  baseURL: 'http://localhost:8983/solr/papers',
  timeout: 5000,
});

const requestSolr = (params) => solr.get('/select', { params }).catch((error) => {
  c.log(error);
});

const requestSolrMoreLikeThis = () => solr.post('/config', {
  'add-requesthandler': {
    name: '/mlt',
    class: 'solr.MoreLikeThisHandler',
    defaults: { 'mlt.fl': 'body' },
  },
}).catch((error) => {
  c.log(error);
});

app.get('/paper/:id', async (req, res) => {
  if (!req.params.id) res.json({ err: 'Paper ID is needed!' });

  const params = {
    q: `id:${req.params.id}`,
    'q.op': 'OR',
    wt: 'json',
    rows: 1,
  };

  const response = await requestSolr(params);
  res.json(response.data.response.docs[0]);
});

app.get('/moreLikeThis/:id', async (req, res) => {
  // Request Parameters
  const { id } = req.params;

  // General Parameters
  const params = new URLSearchParams();
  params.append('q.op', 'AND');
  params.append('wt', 'json');
  params.append('defType', 'lucene');
  params.append('q', `{!mlt qf=title summary mintf=1 mindf=0}${id}`);
  params.append('hl', 'true');
  params.append('hl.simple.pre', '<b>');
  params.append('hl.simple.post', '</b>');
  params.append('hl.fl', 'title');

  // Request
  const response = await requestSolr(params);
  const data = [];
  response.data.response.docs.forEach((item) => {
    data.push(item);
  });

  const reply = {
    papers: data,
    total: response.data.response.numFound,
    pages: Math.ceil(response.data.response.numFound / 10),
  };

  res.status(200).json(reply);
});

app.get('/search', async (req, res) => {
  let query = '';

  // Request Parameters
  const sort = req.query.sort ? req.query.sort : null; // dates asc or desc
  const page = req.query.page ? req.query.page - 1 : 0; // page number
  const areas = req.query.areas ? JSON.parse(req.query.areas).areas : [];
  const fields = req.query.fields ? JSON.parse(req.query.fields).fields : [];
  const subjects = req.query.subjects ? JSON.parse(req.query.subjects).subjects : [];
  query = (areas.length || fields.length || subjects.length || req.query.query) ? req.query.query : '*:*'; // input
  const date = req.query.date ? JSON.parse(req.query.date).date : null;

  // General Parameters
  const params = new URLSearchParams();
  params.append('q.op', 'AND');
  params.append('wt', 'json');
  params.append('defType', 'edismax');
  params.append('rows', '10');
  params.append('start', (page * 10).toString());
  params.append('qf', 'link summary^2 title^10 authors date areas^5 fields^5 subjects^5');
  params.append('hl', 'true');
  params.append('hl.simple.pre', '<b>');
  params.append('hl.simple.post', '</b>');

  let highliteds = '';
  if (areas.length > 0) {
    highliteds = highliteds.concat(' areas');
  }
  if (fields.length > 0) {
    highliteds = highliteds.concat(' fields');
  }
  if (subjects.length > 0) {
    highliteds = highliteds.concat(' subjects');
  }
  if (req.query.query) {
    highliteds = highliteds.concat(' title summary authors');
  }

  params.append('hl.fl', highliteds);
  if (date) {
    params.append('fq', `date:[${date[0]} TO ${date[1]}]`);
  }

  // Area
  areas.forEach((area) => {
    query = query.concat(' ', `areas:(${area})`);
  });

  // Fields
  fields.forEach((field) => {
    query = query.concat(' ', `fields:(${field})`);
  });

  // Subjects
  subjects.forEach((subject) => {
    query = query.append(' ', `subjects:(${subject})`);
  });

  params.append('q', query);

  // Sort
  if (sort && sort !== 'Relevance') {
    params.append('sort', sort);
  }

  // Request
  const response = await requestSolr(params);
  const data = [];

  response.data.response.docs.forEach((item) => {
    data.push(item);
  });

  const reply = {
    hightlightings: response.data.highlighting,
    papers: data,
    total: response.data.response.numFound,
    pages: Math.ceil(response.data.response.numFound / 10),
  };

  res.status(200).json(reply);
});

app.listen(PORT, () => {
  c.log(`Server listening on ${PORT}`);
  requestSolrMoreLikeThis();
});
