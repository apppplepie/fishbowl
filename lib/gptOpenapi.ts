// Single source for the dynamic schema and generated standalone YAML files.
type Schema = Record<string, unknown>;
const text = (maxLength = 2000, description?: string): Schema => ({type: 'string', maxLength, ...(description ? {description} : {})});
const ref = (name: string) => ({$ref: `#/components/schemas/${name}`});
const list = (items: Schema, maxItems = 10): Schema => ({type: 'array', items, maxItems});
const obj = (properties: Record<string, Schema>, required: string[] = []): Schema => ({type: 'object', additionalProperties: false, properties, ...(required.length ? {required} : {})});
const access = {type: 'integer', minimum: 1, maximum: 5, description: '1=P public, 2=G general, 3=M member, 4=A adult, 5=R root. Assess each block.'};
const articleRef = text(2048, 'Article ID or same-site /article/{id} URL.');
const requestId = {...text(80, 'Unique request identifier. Retry identical input with the SAME ID; use a new ID for a new edit.'), pattern: '^[\\w-]+$'};
const revision = text(64, 'Revision from getArticle. On 409, reread before editing.');
const status = {type: 'string', enum: ['draft', 'published'], default: 'draft'};
const baseEdit = {article_ref: articleRef, request_id: requestId, expected_revision: revision};
const editRequired = ['article_ref', 'request_id', 'expected_revision'];
const schemas: Record<string, Schema> = {
  Metadata: obj({source_url: text(2000), language: text(35), description: text(2000)}),
  Curate: obj({...baseEdit, tags: list(text(80)), tag_mode: {type:'string', enum:['append','replace'], default:'append'},
    summary: text(2000, 'Short neutral summary. Also supplies excerpt when excerpt is omitted.'), excerpt: text(500), metadata: ref('Metadata'),
    block_order: list(text(36),500), block_splits: list(obj({block_id:text(36),parts:list(text(60000),20)},['block_id','parts']),20)}, editRequired),
  RatedBlock: obj({type:{type:'string',enum:['text','code','image']}, content:text(60000), language:text(80), media_id:text(36),
    title:text(255), description:text(2000), access_level:access},['type','access_level']),
  SaveRated: obj({request_id:requestId, article_ref:articleRef, expected_revision:revision, title:text(255), summary:text(2000), excerpt:text(500),
    tags:list(text(80)), category_id:text(36), article_type:{type:'string',enum:['default','text','image','code','diary','drawing'],default:'text'},
    blocks:{...list(ref('RatedBlock'),80),minItems:1}, status, rating_reason:text(2000), metadata:ref('Metadata')},['request_id']),
  ImagePlacement: obj({media_id:text(36),after_block_id:{type:['string','null'],maxLength:36,description:'Existing anchor block ID; null inserts at start.'},
    title:text(255), description:text(2000), prompt:text(2000), access_level:access, set_cover:{type:'boolean',default:false}},['media_id','after_block_id','description','access_level']),
  Illustrate: obj({...baseEdit,images:{...list(ref('ImagePlacement'),5),minItems:1}},[...editRequired,'images']),
  Receipt: obj({success:{type:'boolean'},article_id:text(36),revision:text(64),status,block_count:{type:'integer'},tags:list(text(80),500),
    visible_access_level:access,full_access_level:access,cover_access_level:access,added_block_ids:list(text(36),5)}),
  Error: obj({success:{type:'boolean'},error:text(2000)}),
  ArticlePage: obj({success:{type:'boolean'},article_id:text(36),revision:text(64),status,block_count:{type:'integer'},tags:list(text(80),500),
    visible_access_level:access,full_access_level:access,cover_access_level:access,
    article:obj({title:text(255),excerpt:{type:['string','null']},article_type:text(20),category_id:{type:['string','null']},summary:{type:['string','null']},metadata:ref('Metadata'),rating_reason:{type:['string','null']}}),
    blocks:list(obj({id:text(36),type:text(20),access_level:access,media_id:{type:['string','null']},order:{type:'integer'},
      content_json:text(8000),content_offset:{type:'integer'},content_length:{type:'integer'}}),10),
    next:{type:['object','null'],properties:{offset:{type:'integer'},block_offset:{type:'integer'}}},hint:text(500)}),
  Search: obj({success:{type:'boolean'},articles:list(obj({id:text(36),title:text(255),excerpt:{type:['string','null']},status,type:text(20),category_id:{type:['string','null']}}),20),next_offset:{type:['integer','null']}}),
  Context: obj({success:{type:'boolean'},tags:list(text(80),30),next_offset:{type:['integer','null']},
    identity:obj({role:text(20),max_access_level:access}),image_allowed_hosts:list(text(255),100),
    rating_policy:obj({version:text(80),levels:list(obj({value:access,label:text(2),meaning:text(100)}),5),guidance:text(1000)})}),
  Categories: obj({success:{type:'boolean'},count:{type:'integer'},hint:text(500),categories:list(obj({id:text(36),name:text(255),parent_id:{type:['string','null']},depth:{type:'integer'},path:text(1000),breadcrumb:text(2000)}),1000)}),
  Media: obj({success:{type:'boolean'},media_id:text(36),url:text(4000),fullUrl:text(4000)}),
  UploadImage: obj({
    openaiFileIdRefs:{
      type:'array',
      description:'Conversation image files (user uploads or ChatGPT-generated). Pass the files here; Actions converts paths to short-lived HTTPS download links. Prefer this over base64.',
      items:{type:'string'},
      maxItems:10,
    },
    base64:{type:'string',description:'Fallback only: data:image/png;base64,<payload>. Prefer openaiFileIdRefs for uploaded/generated files.'},
    filename:text(255,'Optional file name when using base64. Server generates one when omitted.'),
    title:text(255),
    description:text(2000),
  }),
};
function response(name: string) { return {description:'OK',content:{'application/json':{schema:ref(name)}}}; }
function operation(id: string, description: string, output: string, input?: string): Schema {
  return {operationId:id,summary:description,responses:{'200':response(output),default:{...response('Error'),description:'400 invalid input; 401/403 authentication/permission; 404 missing; 409 revision/request conflict; 413 too large; 500/504 server/timeout.'}},
    ...(input ? {requestBody:{required:true,content:{'application/json':{schema:ref(input)}}}} : {})};
}
const param = (name: string, schema: Schema = text(100), required = false, location = 'query') => ({name,in:location,required,schema});
const offset = {type:'integer',minimum:0,default:0};
const paths: Record<string, Record<string, Schema>> = {
  '/articles/{id}': {get:{...operation('getArticle','Read editable article by ID extracted from its link. Fetch all pages at the same revision before curation or image planning. Content slices preserve original text.','ArticlePage'),parameters:[param('id',text(36),true,'path'),param('offset',offset),param('block_offset',offset)]}},
  '/articles': {get:{...operation('searchArticles','Search editable article titles and excerpts, including drafts. Returns 20 results per page.','Search'),parameters:[param('q'),param('status',{type:'string',enum:['all','draft','published'],default:'all'}),param('offset',offset)]}},
  '/context': {get:{...operation('getEditorialContext','Get existing tags, rating definitions, identity limits and allowed image hosts. Reuse matching tags.','Context'),parameters:[param('q'),param('offset',offset)]}},
  '/categories': {get:operation('getCategories','Get existing category breadcrumbs. Preserve category for old articles; omit category_id for new articles if uncertain.','Categories')},
  '/curate': {post:operation('curateArticle','Organize an existing article without rewriting. Tags append by default. Reorder all block IDs or split text into exact original substrings. Category, type, ratings and cover stay unchanged.','Receipt','Curate')},
  '/save-rated': {post:operation('saveRatedArticle','Create: title, summary, blocks with access_level, rating_reason required. Draft by default; status=published publishes. Existing article: send ONLY article_ref, expected_revision, request_id, status to publish/unpublish.','Receipt','SaveRated')},
  '/illustrate': {post:operation('attachArticleImages','Attach registered images after existing blocks (null=start). Get media_id via uploadImage(openaiFileIdRefs) for chat files, or registerImage for allowlisted HTTPS URLs. Include description, prompt and level.','Receipt','Illustrate')},
  '/media': {post:{...operation('registerImage','Import an image URL from an allowed HTTPS host into media storage. No redirects; max 5 MB. For ChatGPT uploads/generated files use uploadImage with openaiFileIdRefs instead.','Media'),requestBody:{required:true,content:{'application/json':{schema:obj({url:text(4000)},['url'])}}}}},
  '/upload': {post:operation('uploadImage','Register a conversation image into media and return media_id. Prefer openaiFileIdRefs (user uploads or generated images; Actions bridges to HTTPS). base64 is fallback only. Then call attachArticleImages.','Media','UploadImage')},
};
const bundles: Record<string, string[]> = {
  curate:['/articles/{id}','/articles','/context','/curate'],
  publish:['/articles/{id}','/context','/categories','/save-rated','/media','/upload'],
  illustrate:['/articles/{id}','/context','/illustrate','/media','/upload'],
};
export function buildGptOpenapi(baseUrl = 'https://creepender.top/api/gpt', bundle?: string) {
  const selected = bundle ? bundles[bundle] : Object.keys(paths);
  if (!selected) throw new Error('Unknown tool bundle');
  const chosenPaths = Object.fromEntries(selected.map(p=>[p,paths[p]]));
  const used = new Set<string>();
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' && typeof child === 'string') {
        const name = child.split('/').pop()!;
        if (!used.has(name)) { used.add(name); visit(schemas[name]); }
      } else visit(child);
    }
  }
  visit(chosenPaths);
  return {openapi:'3.1.0',info:{title:`Fishbowl GPT ${bundle ?? 'Content Tools'}`,version:'4.0.0',description:'Curate, rate and publish articles, and attach generated images.'},
    servers:[{url:baseUrl}],security:[{BearerAuth:[]}],paths:chosenPaths,
    components:{securitySchemes:{BearerAuth:{type:'http',scheme:'bearer'}},schemas:Object.fromEntries([...used].sort().map(n=>[n,schemas[n]]))}};
}
