import { Router } from 'express'; import { requireAuth } from '../middleware/auth.js'; import { financialHealthScore, recommendations } from '../services/financialAssistant.js';
export const router=Router();
router.get('/health',(_req,res)=>res.json({status:'ok',service:'sawn-api'}));
router.get('/me',requireAuth,(req,res)=>res.json({user:req.user}));
const resources=['salary-plans','allocations','wallets','transactions','goals','families','notifications','reports'];
for(const name of resources){ router.get(`/${name}`,requireAuth,(_req,res)=>res.json({items:[]})); router.post(`/${name}`,requireAuth,(req,res)=>res.status(201).json({id:crypto.randomUUID(),...req.body})); }
router.post('/assistant/insights', requireAuth, (req,res)=>{ const {income=0,spending=0,savings=0}=req.body; res.json(recommendations(income,spending,savings)); });
router.get('/analytics/score', requireAuth, (req,res)=>res.json({score:financialHealthScore(Number(req.query.income||0),Number(req.query.spending||0),Number(req.query.savings||0))}));
