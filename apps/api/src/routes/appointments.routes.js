const express = require('express');
const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/requireAuth');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const env = require('../lib/env');

const router = express.Router();

router.get('/', requireAuth(), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .order('appointment_date', { ascending: true });

    if (error) throw error;
    res.json({ appointments: data || [] });
}));

router.post('/', requireAuth(), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const {
        child_id,
        appointment_date,
        appointment_time,
        doctor_name,
        reason,
        fee_amount,
        payment_status,
        upi_transaction_id,
        upi_transaction_ref
    } = req.body;

    if (!child_id || !appointment_date || !appointment_time) {
        return res.status(400).json({ error: 'Required fields are missing' });
    }

    // குழந்தையின் பெயரைக் கண்டுபிடித்து எடுப்பது
    let childName = 'Child';
    const { data: childData } = await supabaseAdmin
        .from('children')
        .select('*')
        .eq('id', child_id)
        .single();

    if (childData) {
        childName = childData.full_name || childData.name || 'Child';
    }

    const defaultFee = parseFloat(env.UPI_AMOUNT) || 500;

    const { data, error } = await supabaseAdmin
        .from('appointments')
        .insert([{
            user_id: userId,
            child_id: child_id,
            child_name: childName,
            appointment_date: appointment_date,
            appointment_time: appointment_time,
            doctor_name: doctor_name || 'Dr. Default',
            reason: reason || 'Routine Checkup',
            fee_amount: fee_amount !== undefined ? fee_amount : defaultFee,
            payment_status: payment_status || 'pending',
            upi_transaction_id: upi_transaction_id || null,
            upi_transaction_ref: upi_transaction_ref || null,
            paid_at: payment_status === 'paid' ? new Date().toISOString() : null,
        }])
        .select();

    if (error) {
        console.error('Appointment booking error:', error);
        return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ success: true, appointment: data ? data[0] : null });
}));

// PATCH /api/appointments/:id/payment
// Update the payment status and transaction reference for an appointment
router.patch('/:id/payment', requireAuth(), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { upi_transaction_id, upi_transaction_ref, payment_status } = req.body;

    if (!payment_status || !['pending', 'paid'].includes(payment_status)) {
        return res.status(400).json({ error: 'payment_status must be "pending" or "paid"' });
    }

    if (payment_status === 'paid' && !upi_transaction_id) {
        return res.status(400).json({ error: 'upi_transaction_id is required when marking as paid' });
    }

    // Verify the appointment belongs to the user
    const { data: existing, error: fetchError } = await supabaseAdmin
        .from('appointments')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

    if (fetchError || !existing) {
        return res.status(404).json({ error: 'Appointment not found' });
    }

    const updateData = {
        payment_status,
        upi_transaction_id: upi_transaction_id || null,
        upi_transaction_ref: upi_transaction_ref || null,
        paid_at: payment_status === 'paid' ? new Date().toISOString() : null,
    };

    const { data, error } = await supabaseAdmin
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select();

    if (error) {
        console.error('Payment update error:', error);
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, appointment: data ? data[0] : null });
}));

router.delete('/:id', requireAuth(), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await supabaseAdmin
        .from('appointments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true, message: 'Appointment deleted successfully' });
}));
module.exports = router;
