const express = require('express');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/requireAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

const router = express.Router();

router.get('/', requireAuth(), asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .order('appointment_date', { ascending: true });

    if (error) {
        console.error('Dashboard fetch error:', error);
        return res.json({ appointments: [] });
    }

    res.json({ appointments: data || [] });
}));

module.exports = router;