const router = require('express').Router();
const ctrl   = require('../controllers/reservationCtrl');

router.get('/',    ctrl.getReservations);
router.post('/',   ctrl.createReservation);
router.put('/:id', ctrl.updateReservation);
router.delete('/:id', ctrl.deleteReservation);

module.exports = router;
