const express = require('express');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/requireAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

const router = express.Router();

// GET /api/visits?cid=xxx (or ?child_id=xxx)
router.get('/', requireAuth(), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const childId = req.query.cid || req.query.child_id;

    if (!childId) {
        return res.json({ visits: [] });
    }

    const { data, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .eq('child_id', childId)
        .order('appointment_date', { ascending: false });

    if (error) {
        console.error('Visits fetch error:', error);
        return res.json({ visits: [] });
    }

    res.json({ visits: data || [] });
}));

module.exports = router;