const express = require('express');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/requireAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

const router = express.Router();

router.get('/', requireAuth(), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
        .from('children')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ children: data || [] });
}));

router.post('/', requireAuth(), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { full_name, name, date_of_birth, dob, blood_group, health_concerns } = req.body;

    const childName = full_name || name;
    const childDob = dob || date_of_birth;

    if (!childName) {
        return res.status(400).json({ error: 'Child name is required' });
    }

    const { data, error } = await supabaseAdmin
        .from('children')
        .insert([{
            user_id: userId,
            full_name: childName,
            dob: childDob || null,
            blood_group: blood_group || null,
            health_concerns: health_concerns || null
        }])
        .select();

    if (error) {
        console.error('Insert child error:', error);
        return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ success: true, child: data ? data[0] : null });
}));

router.delete('/:id', requireAuth(), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const childId = req.params.id;

    const { error } = await supabaseAdmin
        .from('children')
        .delete()
        .eq('id', childId)
        .eq('user_id', userId);

    if (error) {
        console.error('Delete child error:', error);
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Child deleted successfully' });
}));
module.exports = router;