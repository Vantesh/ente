package emergency

import (
	"github.com/ente-io/museum/ente"
	"github.com/ente-io/stacktrace"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

func (c *Controller) StartRecovery(ctx *gin.Context,
	actorUserID int64,
	req ente.ContactIdentifier) error {
	if req.EmergencyContactID == req.UserID {
		return stacktrace.Propagate(ente.NewBadRequestWithMessage("contact and user can not be same"), "")
	}
	if req.EmergencyContactID != actorUserID {
		return stacktrace.Propagate(ente.ErrPermissionDenied, "only the emergency contact can start recovery")
	}

	contact, err := c.Repo.GetActiveEmergencyContact(ctx, req.UserID, req.EmergencyContactID)
	if err != nil {
		return stacktrace.Propagate(err, "")
	}

	hasUpdate, err := c.Repo.InsertIntoRecovery(ctx, req, *contact)
	if !hasUpdate {
		log.WithField("userID", actorUserID).WithField("req", req).
			Warn("No need to send email")
	}
	if err != nil {
		return stacktrace.Propagate(err, "")
	}
	return nil
}

func (c *Controller) RejectRecovery(ctx *gin.Context,
	userID int64,
	req ente.RecoveryIdentifier) error {
	if req.EmergencyContactID == req.UserID {
		return stacktrace.Propagate(ente.NewBadRequestWithMessage("contact and user can not be same"), "")
	}
	if req.UserID != userID {
		return stacktrace.Propagate(ente.ErrPermissionDenied, "only account owner can reject recovery")
	}
	hasUpdate, err := c.Repo.UpdateRecoveryStatusForID(ctx, req.ID, ente.RecoveryStatusRejected)
	if !hasUpdate {
		log.WithField("userID", userID).WithField("req", req).
			Warn("no row updated while rejecting recovery")
	}
	if err != nil {
		return stacktrace.Propagate(err, "")
	}
	return nil
}

func (c *Controller) StopRecovery(ctx *gin.Context,
	userID int64,
	req ente.RecoveryIdentifier) error {
	if req.EmergencyContactID == req.UserID {
		return stacktrace.Propagate(ente.NewBadRequestWithMessage("contact and user can not be same"), "")
	}
	if req.EmergencyContactID != userID {
		return stacktrace.Propagate(ente.ErrPermissionDenied, "only the emergency contact can stop recovery")
	}
	hasUpdate, err := c.Repo.UpdateRecoveryStatusForID(ctx, req.ID, ente.RecoveryStatusStopped)
	if !hasUpdate && err == nil {
		log.WithField("userID", userID).WithField("req", req).
			Warn("no row updated while stopping recovery")
	} else {
		log.WithField("userID", userID).WithField("req", req).Info("stopped recovery")
	}
	return stacktrace.Propagate(err, "")
}
