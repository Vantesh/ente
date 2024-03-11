import { t } from "i18next";
import { useContext, useState } from "react";

// import FixLargeThumbnails from 'components/FixLargeThumbnail';
import RecoveryKey from "@ente/shared/components/RecoveryKey";
import {
    ACCOUNTS_PAGES,
    PHOTOS_PAGES as PAGES,
} from "@ente/shared/constants/pages";
import TwoFactorModal from "components/TwoFactor/Modal";
import { useRouter } from "next/router";
import { AppContext } from "pages/_app";
// import mlIDbStorage from 'utils/storage/mlIDbStorage';
import {
    configurePasskeyRecovery,
    isPasskeyRecoveryEnabled,
} from "@ente/accounts/services/passkey";
import { APPS, CLIENT_PACKAGE_NAMES } from "@ente/shared/apps/constants";
import ThemeSwitcher from "@ente/shared/components/ThemeSwitcher";
import { getRecoveryKey } from "@ente/shared/crypto/helpers";
import { encryptToB64 } from "@ente/shared/crypto/internal/libsodium";
import { getAccountsURL } from "@ente/shared/network/api";
import { logError } from "@ente/shared/sentry";
import { THEME_COLOR } from "@ente/shared/themes/constants";
import { EnteMenuItem } from "components/Menu/EnteMenuItem";
import WatchFolder from "components/WatchFolder";
import isElectron from "is-electron";
import { getAccountsToken } from "services/userService";
import { getDownloadAppMessage } from "utils/ui";
import { isInternalUser } from "utils/user";
import { v4 as uuidv4 } from "uuid";
import Preferences from "./Preferences";

export default function UtilitySection({ closeSidebar }) {
    const router = useRouter();
    const appContext = useContext(AppContext);
    const {
        setDialogMessage,
        startLoading,
        watchFolderView,
        setWatchFolderView,
        themeColor,
        setThemeColor,
    } = appContext;

    const [recoverModalView, setRecoveryModalView] = useState(false);
    const [twoFactorModalView, setTwoFactorModalView] = useState(false);
    const [preferencesView, setPreferencesView] = useState(false);

    const openPreferencesOptions = () => setPreferencesView(true);
    const closePreferencesOptions = () => setPreferencesView(false);

    const openRecoveryKeyModal = () => setRecoveryModalView(true);
    const closeRecoveryKeyModal = () => setRecoveryModalView(false);

    const openTwoFactorModal = () => setTwoFactorModalView(true);
    const closeTwoFactorModal = () => setTwoFactorModalView(false);

    const openWatchFolder = () => {
        if (isElectron()) {
            setWatchFolderView(true);
        } else {
            setDialogMessage(getDownloadAppMessage());
        }
    };
    const closeWatchFolder = () => setWatchFolderView(false);

    const redirectToChangePasswordPage = () => {
        closeSidebar();
        router.push(PAGES.CHANGE_PASSWORD);
    };

    const redirectToChangeEmailPage = () => {
        closeSidebar();
        router.push(PAGES.CHANGE_EMAIL);
    };

    const redirectToAccountsPage = async () => {
        closeSidebar();

        try {
            // check if the user has passkey recovery enabled
            const recoveryEnabled = await isPasskeyRecoveryEnabled();
            if (!recoveryEnabled) {
                // let's create the necessary recovery information
                const recoveryKey = await getRecoveryKey();

                const resetSecret = uuidv4();

                const encryptionResult = await encryptToB64(
                    resetSecret,
                    recoveryKey,
                );

                await configurePasskeyRecovery(
                    resetSecret,
                    encryptionResult.encryptedData,
                    encryptionResult.nonce,
                );
            }

            const accountsToken = await getAccountsToken();

            window.location.href = `${getAccountsURL()}${
                ACCOUNTS_PAGES.ACCOUNT_HANDOFF
            }?package=${CLIENT_PACKAGE_NAMES.get(
                APPS.PHOTOS,
            )}&token=${accountsToken}`;
        } catch (e) {
            logError(e, "failed to redirect to accounts page");
        }
    };

    const redirectToDeduplicatePage = () => router.push(PAGES.DEDUPLICATE);

    const somethingWentWrong = () =>
        setDialogMessage({
            title: t("ERROR"),
            content: t("RECOVER_KEY_GENERATION_FAILED"),
            close: { variant: "critical" },
        });

    const toggleTheme = () => {
        setThemeColor((themeColor) =>
            themeColor === THEME_COLOR.DARK
                ? THEME_COLOR.LIGHT
                : THEME_COLOR.DARK,
        );
    };

    return (
        <>
            {isElectron() && (
                <EnteMenuItem
                    onClick={openWatchFolder}
                    variant="secondary"
                    label={t("WATCH_FOLDERS")}
                />
            )}
            <EnteMenuItem
                variant="secondary"
                onClick={openRecoveryKeyModal}
                label={t("RECOVERY_KEY")}
            />
            {isInternalUser() && (
                <EnteMenuItem
                    onClick={toggleTheme}
                    variant="secondary"
                    label={t("CHOSE_THEME")}
                    endIcon={
                        <ThemeSwitcher
                            themeColor={themeColor}
                            setThemeColor={setThemeColor}
                        />
                    }
                />
            )}
            <EnteMenuItem
                variant="secondary"
                onClick={openTwoFactorModal}
                label={t("TWO_FACTOR")}
            />

            <EnteMenuItem
                variant="secondary"
                onClick={redirectToAccountsPage}
                label={t("PASSKEYS")}
            />

            <EnteMenuItem
                variant="secondary"
                onClick={redirectToChangePasswordPage}
                label={t("CHANGE_PASSWORD")}
            />

            <EnteMenuItem
                variant="secondary"
                onClick={redirectToChangeEmailPage}
                label={t("CHANGE_EMAIL")}
            />

            <EnteMenuItem
                variant="secondary"
                onClick={redirectToDeduplicatePage}
                label={t("DEDUPLICATE_FILES")}
            />

            <EnteMenuItem
                variant="secondary"
                onClick={openPreferencesOptions}
                label={t("PREFERENCES")}
            />
            <RecoveryKey
                appContext={appContext}
                show={recoverModalView}
                onHide={closeRecoveryKeyModal}
                somethingWentWrong={somethingWentWrong}
            />
            <TwoFactorModal
                show={twoFactorModalView}
                onHide={closeTwoFactorModal}
                closeSidebar={closeSidebar}
                setLoading={startLoading}
            />
            <WatchFolder open={watchFolderView} onClose={closeWatchFolder} />
            <Preferences
                open={preferencesView}
                onClose={closePreferencesOptions}
                onRootClose={closeSidebar}
            />
        </>
    );
}
