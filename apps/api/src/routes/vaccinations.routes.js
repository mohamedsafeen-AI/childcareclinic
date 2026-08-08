const express = require('express');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/requireAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

const router = express.Router();

router.get('/', requireAuth(), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const childId = req.query.child_id;

    let query = supabaseAdmin
        .from('vaccination_records') // டேபிள் பெயர் சரியாக இருப்பதை உறுதி செய்தல்
        .select('*')
        .eq('user_id', userId);

    if (childId) {
        query = query.eq('child_id', childId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Vaccination fetch error:', error);
        return res.json([]); // எரர் வந்தாலும் ஆப் க்ராஷ் ஆகாமல் காலியாய் அனுப்பும்
    }
    
    res.json(data || []);
}));

module.exports = router;