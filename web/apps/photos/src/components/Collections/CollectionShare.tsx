import { FocusVisibleButton } from "@/base/components/mui/FocusVisibleButton";
import { LoadingButton } from "@/base/components/mui/LoadingButton";
import {
    NestedSidebarDrawer,
    SidebarDrawer,
} from "@/base/components/mui/SidebarDrawer";
import {
    RowButton,
    RowButtonDivider,
    RowButtonGroup,
    RowButtonGroupHint,
    RowButtonGroupTitle,
    RowLabel,
    RowSwitch,
} from "@/base/components/RowButton";
import { Titlebar } from "@/base/components/Titlebar";
import { useModalVisibility } from "@/base/components/utils/modal";
import { useBaseContext } from "@/base/context";
import { sharedCryptoWorker } from "@/base/crypto";
import log from "@/base/log";
import { appendCollectionKeyToShareURL } from "@/gallery/services/share";
import type {
    Collection,
    PublicURL,
    UpdatePublicURL,
} from "@/media/collection";
import { COLLECTION_ROLE, type CollectionUser } from "@/media/collection";
import { PublicLinkCreated } from "@/new/photos/components/share/PublicLinkCreated";
import { avatarTextColor } from "@/new/photos/services/avatar";
import type { CollectionSummary } from "@/new/photos/services/collection/ui";
import { AppContext } from "@/new/photos/types/context";
import { FlexWrapper } from "@ente/shared/components/Container";
import SingleInputForm, {
    type SingleInputFormProps,
} from "@ente/shared/components/SingleInputForm";
import { CustomError, parseSharingErrorCodes } from "@ente/shared/error";
import { formatDateTime } from "@ente/shared/time/format";
import AddIcon from "@mui/icons-material/Add";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BlockIcon from "@mui/icons-material/Block";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import DoneIcon from "@mui/icons-material/Done";
import DownloadSharpIcon from "@mui/icons-material/DownloadSharp";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LinkIcon from "@mui/icons-material/Link";
import ModeEditIcon from "@mui/icons-material/ModeEdit";
import Photo, { default as PhotoIcon } from "@mui/icons-material/Photo";
import PublicIcon from "@mui/icons-material/Public";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import {
    Dialog,
    DialogProps,
    FormHelperText,
    Stack,
    styled,
    Typography,
} from "@mui/material";
import NumberAvatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import Avatar from "components/pages/gallery/Avatar";
import { Formik, type FormikHelpers } from "formik";
import { t } from "i18next";
import { GalleryContext } from "pages/gallery";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Trans } from "react-i18next";
import {
    createShareableURL,
    deleteShareableURL,
    shareCollection,
    unshareCollection,
    updateShareableURL,
} from "services/collectionService";
import { getDeviceLimitOptions } from "utils/collection";
import * as Yup from "yup";

interface CollectionShareProps {
    open: boolean;
    onClose: () => void;
    collection: Collection;
    collectionSummary: CollectionSummary;
}

export const CollectionShare: React.FC<CollectionShareProps> = ({
    collectionSummary,
    ...props
}) => {
    const handleRootClose = () => {
        props.onClose();
    };
    const handleDrawerClose: DialogProps["onClose"] = (_, reason) => {
        if (reason == "backdropClick") {
            handleRootClose();
        } else {
            props.onClose();
        }
    };
    if (!props.collection || !collectionSummary) {
        return <></>;
    }
    const { type } = collectionSummary;

    return (
        <SidebarDrawer
            anchor="right"
            open={props.open}
            onClose={handleDrawerClose}
        >
            <Stack sx={{ gap: "4px", py: "12px" }}>
                <Titlebar
                    onClose={props.onClose}
                    title={
                        type == "incomingShareCollaborator" ||
                        type == "incomingShareViewer"
                            ? t("sharing_details")
                            : t("share_album")
                    }
                    onRootClose={handleRootClose}
                    caption={props.collection.name}
                />
                <Stack sx={{ py: "20px", px: "8px", gap: "24px" }}>
                    {type == "incomingShareCollaborator" ||
                    type == "incomingShareViewer" ? (
                        <SharingDetails
                            collection={props.collection}
                            type={type}
                        />
                    ) : (
                        <>
                            <EmailShare
                                collection={props.collection}
                                onRootClose={handleRootClose}
                            />
                            <PublicShare
                                collection={props.collection}
                                onRootClose={handleRootClose}
                            />
                        </>
                    )}
                </Stack>
            </Stack>
        </SidebarDrawer>
    );
};

function SharingDetails({ collection, type }) {
    const galleryContext = useContext(GalleryContext);

    const ownerEmail =
        galleryContext.user.id === collection.owner?.id
            ? galleryContext.user?.email
            : collection.owner?.email;

    const collaborators = collection.sharees
        ?.filter((sharee) => sharee.role === COLLECTION_ROLE.COLLABORATOR)
        .map((sharee) => sharee.email);

    const viewers =
        collection.sharees
            ?.filter((sharee) => sharee.role === COLLECTION_ROLE.VIEWER)
            .map((sharee) => sharee.email) || [];

    const isOwner = galleryContext.user?.id === collection.owner?.id;

    const isMe = (email: string) => email === galleryContext.user?.email;

    return (
        <>
            <Stack>
                <RowButtonGroupTitle icon={<AdminPanelSettingsIcon />}>
                    {t("owner")}
                </RowButtonGroupTitle>
                <RowButtonGroup>
                    <RowLabel
                        startIcon={<Avatar email={ownerEmail} />}
                        label={isOwner ? t("you") : ownerEmail}
                    />
                </RowButtonGroup>
            </Stack>
            {type == "incomingShareCollaborator" &&
                collaborators?.length > 0 && (
                    <Stack>
                        <RowButtonGroupTitle icon={<ModeEditIcon />}>
                            {t("collaborators")}
                        </RowButtonGroupTitle>
                        <RowButtonGroup>
                            {collaborators.map((item, index) => (
                                <>
                                    <RowLabel
                                        key={item}
                                        startIcon={<Avatar email={item} />}
                                        label={isMe(item) ? t("you") : item}
                                    />
                                    {index !== collaborators.length - 1 && (
                                        <RowButtonDivider />
                                    )}
                                </>
                            ))}
                        </RowButtonGroup>
                    </Stack>
                )}
            {viewers?.length > 0 && (
                <Stack>
                    <RowButtonGroupTitle icon={<Photo />}>
                        {t("viewers")}
                    </RowButtonGroupTitle>
                    <RowButtonGroup>
                        {viewers.map((item, index) => (
                            <>
                                <RowLabel
                                    key={item}
                                    label={isMe(item) ? t("you") : item}
                                    startIcon={<Avatar email={item} />}
                                />
                                {index !== viewers.length - 1 && (
                                    <RowButtonDivider />
                                )}
                            </>
                        ))}
                    </RowButtonGroup>
                </Stack>
            )}
        </>
    );
}

type SetPublicShareProp = React.Dispatch<React.SetStateAction<PublicURL>>;

interface EnablePublicShareOptionsProps {
    collection: Collection;
    setPublicShareProp: (value: PublicURL) => void;
    onLinkCreated: () => void;
}

const EnablePublicShareOptions: React.FC<EnablePublicShareOptionsProps> = ({
    collection,
    setPublicShareProp,
    onLinkCreated,
}) => {
    const galleryContext = useContext(GalleryContext);
    const [sharableLinkError, setSharableLinkError] = useState(null);

    const createSharableURLHelper = async () => {
        try {
            setSharableLinkError(null);
            galleryContext.setBlockingLoad(true);
            const publicURL = await createShareableURL(collection);
            setPublicShareProp(publicURL);
            onLinkCreated();
            galleryContext.syncWithRemote(false, true);
        } catch (e) {
            const errorMessage = handleSharingErrors(e);
            setSharableLinkError(errorMessage);
        } finally {
            galleryContext.setBlockingLoad(false);
        }
    };

    const createCollectPhotoShareableURLHelper = async () => {
        try {
            setSharableLinkError(null);
            galleryContext.setBlockingLoad(true);
            const publicURL = await createShareableURL(collection);
            await updateShareableURL({
                collectionID: collection.id,
                enableCollect: true,
            });
            setPublicShareProp(publicURL);
            onLinkCreated();
            galleryContext.syncWithRemote(false, true);
        } catch (e) {
            const errorMessage = handleSharingErrors(e);
            setSharableLinkError(errorMessage);
        } finally {
            galleryContext.setBlockingLoad(false);
        }
    };

    return (
        <Stack>
            <RowButtonGroupTitle icon={<PublicIcon />}>
                {t("share_link_section_title")}
            </RowButtonGroupTitle>
            <RowButtonGroup>
                <RowButton
                    label={t("create_public_link")}
                    startIcon={<LinkIcon />}
                    onClick={createSharableURLHelper}
                />
                <RowButtonDivider />
                <RowButton
                    label={t("collect_photos")}
                    startIcon={<DownloadSharpIcon />}
                    onClick={createCollectPhotoShareableURLHelper}
                />
            </RowButtonGroup>
            {sharableLinkError && (
                <Typography
                    variant="small"
                    sx={{
                        color: "critical.main",
                        mt: 0.5,
                        textAlign: "center",
                    }}
                >
                    {sharableLinkError}
                </Typography>
            )}
        </Stack>
    );
};

const handleSharingErrors = (error) => {
    const parsedError = parseSharingErrorCodes(error);
    let errorMessage = "";
    switch (parsedError.message) {
        case CustomError.BAD_REQUEST:
            errorMessage = t("sharing_album_not_allowed");
            break;
        case CustomError.SUBSCRIPTION_NEEDED:
            errorMessage = t("sharing_disabled_for_free_accounts");
            break;
        case CustomError.NOT_FOUND:
            errorMessage = t("sharing_user_does_not_exist");
            break;
        default:
            errorMessage = `${t("generic_error_retry")} ${parsedError.message}`;
    }
    return errorMessage;
};

interface EmailShareProps {
    collection: Collection;
    onRootClose: () => void;
}

const EmailShare: React.FC<EmailShareProps> = ({ collection, onRootClose }) => {
    const [addParticipantView, setAddParticipantView] = useState(false);
    const [manageEmailShareView, setManageEmailShareView] = useState(false);

    const closeAddParticipant = () => setAddParticipantView(false);
    const openAddParticipant = () => setAddParticipantView(true);

    const closeManageEmailShare = () => setManageEmailShareView(false);
    const openManageEmailShare = () => setManageEmailShareView(true);

    const participantType = useRef<
        COLLECTION_ROLE.COLLABORATOR | COLLECTION_ROLE.VIEWER
    >(undefined);

    const openAddCollab = () => {
        participantType.current = COLLECTION_ROLE.COLLABORATOR;
        openAddParticipant();
    };

    const openAddViewer = () => {
        participantType.current = COLLECTION_ROLE.VIEWER;
        openAddParticipant();
    };

    return (
        <>
            <Stack>
                <RowButtonGroupTitle icon={<WorkspacesIcon />}>
                    {t("shared_with_people_count", {
                        count: collection.sharees?.length ?? 0,
                    })}
                </RowButtonGroupTitle>
                <RowButtonGroup>
                    {collection.sharees.length > 0 ? (
                        <>
                            <RowButton
                                fontWeight="regular"
                                startIcon={
                                    <AvatarGroup sharees={collection.sharees} />
                                }
                                label={
                                    collection.sharees.length === 1
                                        ? collection.sharees[0]?.email
                                        : null
                                }
                                endIcon={<ChevronRightIcon />}
                                onClick={openManageEmailShare}
                            />
                            <RowButtonDivider />
                        </>
                    ) : null}
                    <RowButton
                        startIcon={<AddIcon />}
                        onClick={openAddViewer}
                        label={t("add_viewers")}
                    />
                    <RowButtonDivider />
                    <RowButton
                        startIcon={<AddIcon />}
                        onClick={openAddCollab}
                        label={t("add_collaborators")}
                    />
                </RowButtonGroup>
            </Stack>
            <AddParticipant
                open={addParticipantView}
                onClose={closeAddParticipant}
                onRootClose={onRootClose}
                collection={collection}
                type={participantType.current}
            />
            <ManageEmailShare
                peopleCount={collection.sharees.length}
                open={manageEmailShareView}
                onClose={closeManageEmailShare}
                onRootClose={onRootClose}
                collection={collection}
            />
        </>
    );
};

const AvatarContainer = styled("div")({
    position: "relative",
    display: "flex",
    alignItems: "center",
    marginLeft: -5,
});

const AvatarContainerOuter = styled("div")({
    position: "relative",
    display: "flex",
    alignItems: "center",
    marginLeft: 8,
});

const AvatarCounter = styled(NumberAvatar)({
    height: 20,
    width: 20,
    fontSize: 10,
    color: avatarTextColor,
});

const SHAREE_AVATAR_LIMIT = 6;

const AvatarGroup = ({ sharees }: { sharees: Collection["sharees"] }) => {
    const hasShareesOverLimit = sharees?.length > SHAREE_AVATAR_LIMIT;
    const countOfShareesOverLimit = sharees?.length - SHAREE_AVATAR_LIMIT;

    return (
        <AvatarContainerOuter>
            {sharees?.slice(0, 6).map((sharee) => (
                <AvatarContainer key={sharee.email}>
                    <Avatar
                        key={sharee.email}
                        email={sharee.email}
                        opacity={100}
                    />
                </AvatarContainer>
            ))}
            {hasShareesOverLimit && (
                <AvatarContainer key="extra-count">
                    <AvatarCounter>+{countOfShareesOverLimit}</AvatarCounter>
                </AvatarContainer>
            )}
        </AvatarContainerOuter>
    );
};

interface AddParticipantProps {
    collection: Collection;
    open: boolean;
    onClose: () => void;
    onRootClose: () => void;
    type: COLLECTION_ROLE.VIEWER | COLLECTION_ROLE.COLLABORATOR;
}

const AddParticipant: React.FC<AddParticipantProps> = ({
    open,
    collection,
    onClose,
    onRootClose,
    type,
}) => {
    const { user, syncWithRemote, emailList } = useContext(GalleryContext);

    const nonSharedEmails = useMemo(
        () =>
            emailList.filter(
                (email) =>
                    !collection.sharees?.find((value) => value.email === email),
            ),
        [emailList, collection.sharees],
    );

    const handleRootClose = () => {
        onClose();
        onRootClose();
    };

    const collectionShare: AddParticipantFormProps["callback"] = async ({
        email,
        emails,
    }) => {
        // if email is provided, means user has custom entered email, so, will need to validate for self sharing
        // and already shared
        if (email) {
            if (email === user.email) {
                throw new Error(t("sharing_with_self"));
            } else if (
                collection?.sharees?.find((value) => value.email === email)
            ) {
                throw new Error(t("sharing_already_shared", { email: email }));
            }
            // set emails to array of one email
            emails = [email];
        }
        for (const email of emails) {
            if (
                email === user.email ||
                collection?.sharees?.find((value) => value.email === email)
            ) {
                // can just skip this email
                continue;
            }
            try {
                await shareCollection(collection, email, type);
                await syncWithRemote(false, true);
            } catch (e) {
                const errorMessage = handleSharingErrors(e);
                throw new Error(errorMessage);
            }
        }
    };

    return (
        <NestedSidebarDrawer
            anchor="right"
            {...{ open, onClose }}
            onRootClose={handleRootClose}
        >
            <Stack sx={{ gap: "4px", py: "12px" }}>
                <Titlebar
                    {...{ onClose }}
                    onRootClose={handleRootClose}
                    title={
                        type === COLLECTION_ROLE.VIEWER
                            ? t("add_viewers")
                            : t("add_collaborators")
                    }
                    caption={collection.name}
                />
                <AddParticipantForm
                    onClose={onClose}
                    callback={collectionShare}
                    optionsList={nonSharedEmails}
                    placeholder={t("enter_email")}
                    fieldType="email"
                    buttonText={
                        type === COLLECTION_ROLE.VIEWER
                            ? t("add_viewers")
                            : t("add_collaborators")
                    }
                    submitButtonProps={{
                        size: "large",
                        sx: { mt: 1, mb: 2 },
                    }}
                    disableAutoFocus
                />
            </Stack>
        </NestedSidebarDrawer>
    );
};

interface AddParticipantFormValues {
    inputValue: string;
    selectedOptions: string[];
}

interface AddParticipantFormProps {
    callback: (props: { email?: string; emails?: string[] }) => Promise<void>;
    fieldType: "text" | "email" | "password";
    placeholder: string;
    buttonText: string;
    submitButtonProps?: any;
    initialValue?: string;
    secondaryButtonAction?: () => void;
    disableAutoFocus?: boolean;
    hiddenPreInput?: any;
    caption?: any;
    hiddenPostInput?: any;
    autoComplete?: string;
    blockButton?: boolean;
    hiddenLabel?: boolean;
    onClose?: () => void;
    optionsList?: string[];
}

const AddParticipantForm: React.FC<AddParticipantFormProps> = (props) => {
    const { submitButtonProps } = props;
    const { sx: buttonSx, ...restSubmitButtonProps } = submitButtonProps ?? {};

    const [loading, SetLoading] = useState(false);

    const submitForm = async (
        values: AddParticipantFormValues,
        { setFieldError, resetForm }: FormikHelpers<AddParticipantFormValues>,
    ) => {
        try {
            SetLoading(true);
            if (values.inputValue !== "") {
                await props.callback({ email: values.inputValue });
            } else if (values.selectedOptions.length !== 0) {
                await props.callback({ emails: values.selectedOptions });
            }
            SetLoading(false);
            props.onClose();
            resetForm();
        } catch (e) {
            setFieldError("inputValue", e?.message);
            SetLoading(false);
        }
    };

    const validationSchema = useMemo(() => {
        switch (props.fieldType) {
            case "text":
                return Yup.object().shape({
                    inputValue: Yup.string().required(t("required")),
                });
            case "email":
                return Yup.object().shape({
                    inputValue: Yup.string().email(t("invalid_email_error")),
                });
        }
    }, [props.fieldType]);

    const handleInputFieldClick = (setFieldValue) => {
        setFieldValue("selectedOptions", []);
    };

    return (
        <Formik<AddParticipantFormValues>
            initialValues={{
                inputValue: props.initialValue ?? "",
                selectedOptions: [],
            }}
            onSubmit={submitForm}
            validationSchema={validationSchema}
            validateOnChange={false}
            validateOnBlur={false}
        >
            {({
                values,
                errors,
                handleChange,
                handleSubmit,
                setFieldValue,
            }) => (
                <form noValidate onSubmit={handleSubmit}>
                    <Stack sx={{ gap: "24px", py: "20px", px: "12px" }}>
                        {props.hiddenPreInput}
                        <Stack>
                            <RowButtonGroupTitle>
                                {t("add_new_email")}
                            </RowButtonGroupTitle>
                            <TextField
                                sx={{ marginTop: 0 }}
                                hiddenLabel={props.hiddenLabel}
                                fullWidth
                                type={props.fieldType}
                                id={props.fieldType}
                                onChange={handleChange("inputValue")}
                                onClick={() =>
                                    handleInputFieldClick(setFieldValue)
                                }
                                name={props.fieldType}
                                {...(props.hiddenLabel
                                    ? { placeholder: props.placeholder }
                                    : { label: props.placeholder })}
                                error={Boolean(errors.inputValue)}
                                helperText={errors.inputValue}
                                value={values.inputValue}
                                disabled={loading}
                                autoFocus={!props.disableAutoFocus}
                                autoComplete={props.autoComplete}
                            />
                        </Stack>

                        {props.optionsList.length > 0 && (
                            <Stack>
                                <RowButtonGroupTitle>
                                    {t("or_add_existing")}
                                </RowButtonGroupTitle>
                                <RowButtonGroup>
                                    {props.optionsList.map((item, index) => (
                                        <React.Fragment key={item}>
                                            <RowButton
                                                fontWeight="regular"
                                                onClick={() => {
                                                    if (
                                                        values.selectedOptions.includes(
                                                            item,
                                                        )
                                                    ) {
                                                        setFieldValue(
                                                            "selectedOptions",
                                                            values.selectedOptions.filter(
                                                                (
                                                                    selectedOption,
                                                                ) =>
                                                                    selectedOption !==
                                                                    item,
                                                            ),
                                                        );
                                                    } else {
                                                        setFieldValue(
                                                            "selectedOptions",
                                                            [
                                                                ...values.selectedOptions,
                                                                item,
                                                            ],
                                                        );
                                                    }
                                                }}
                                                label={item}
                                                startIcon={
                                                    <Avatar email={item} />
                                                }
                                                endIcon={
                                                    values.selectedOptions.includes(
                                                        item,
                                                    ) ? (
                                                        <DoneIcon />
                                                    ) : null
                                                }
                                            />
                                            {index !==
                                                props.optionsList.length -
                                                    1 && <RowButtonDivider />}
                                        </React.Fragment>
                                    ))}
                                </RowButtonGroup>
                            </Stack>
                        )}

                        <FormHelperText
                            sx={{
                                position: "relative",
                                top: errors.inputValue ? "-22px" : "0",
                                float: "right",
                                padding: "0 8px",
                            }}
                        >
                            {props.caption}
                        </FormHelperText>
                        {props.hiddenPostInput}
                    </Stack>
                    <FlexWrapper
                        px={"8px"}
                        justifyContent={"center"}
                        flexWrap={props.blockButton ? "wrap-reverse" : "nowrap"}
                    >
                        <Stack sx={{ px: "8px", width: "100%" }}>
                            {props.secondaryButtonAction && (
                                <FocusVisibleButton
                                    onClick={props.secondaryButtonAction}
                                    fullWidth
                                    color="secondary"
                                    sx={{
                                        "&&&": {
                                            mt: !props.blockButton ? 2 : 0.5,
                                            mb: !props.blockButton ? 4 : 0,
                                            mr: !props.blockButton ? 1 : 0,
                                            ...buttonSx,
                                        },
                                    }}
                                    {...restSubmitButtonProps}
                                >
                                    {t("cancel")}
                                </FocusVisibleButton>
                            )}

                            <LoadingButton
                                type="submit"
                                color="accent"
                                fullWidth
                                buttonText={props.buttonText}
                                loading={loading}
                                sx={{ mt: 2, mb: 4 }}
                                {...restSubmitButtonProps}
                            >
                                {props.buttonText}
                            </LoadingButton>
                        </Stack>
                    </FlexWrapper>
                </form>
            )}
        </Formik>
    );
};

interface ManageEmailShareProps {
    collection: Collection;
    open: boolean;
    onClose: () => void;
    onRootClose: () => void;
    peopleCount: number;
}

const ManageEmailShare: React.FC<ManageEmailShareProps> = ({
    open,
    collection,
    onClose,
    onRootClose,
    peopleCount,
}) => {
    const { showLoadingBar, hideLoadingBar } = useContext(AppContext);
    const galleryContext = useContext(GalleryContext);

    const [addParticipantView, setAddParticipantView] = useState(false);
    const [manageParticipantView, setManageParticipantView] = useState(false);

    const closeAddParticipant = () => setAddParticipantView(false);
    const openAddParticipant = () => setAddParticipantView(true);

    const participantType = useRef<
        COLLECTION_ROLE.COLLABORATOR | COLLECTION_ROLE.VIEWER
    >(null);

    const selectedParticipant = useRef<CollectionUser>(null);

    const openAddCollab = () => {
        participantType.current = COLLECTION_ROLE.COLLABORATOR;
        openAddParticipant();
    };

    const openAddViewer = () => {
        participantType.current = COLLECTION_ROLE.VIEWER;
        openAddParticipant();
    };

    const handleRootClose = () => {
        onClose();
        onRootClose();
    };

    const collectionUnshare = async (email: string) => {
        try {
            showLoadingBar();
            await unshareCollection(collection, email);
            await galleryContext.syncWithRemote(false, true);
        } finally {
            hideLoadingBar();
        }
    };

    const ownerEmail =
        galleryContext.user.id === collection.owner?.id
            ? galleryContext.user.email
            : collection.owner?.email;

    const isOwner = galleryContext.user.id === collection.owner?.id;

    const collaborators = collection.sharees
        ?.filter((sharee) => sharee.role === COLLECTION_ROLE.COLLABORATOR)
        .map((sharee) => sharee.email);

    const viewers =
        collection.sharees
            ?.filter((sharee) => sharee.role === COLLECTION_ROLE.VIEWER)
            .map((sharee) => sharee.email) || [];

    const openManageParticipant = (email) => {
        selectedParticipant.current = collection.sharees.find(
            (sharee) => sharee.email === email,
        );
        setManageParticipantView(true);
    };
    const closeManageParticipant = () => {
        setManageParticipantView(false);
    };

    return (
        <>
            <NestedSidebarDrawer
                anchor="right"
                {...{ open, onClose }}
                onRootClose={handleRootClose}
            >
                <Stack sx={{ gap: "4px", py: "12px" }}>
                    <Titlebar
                        onClose={onClose}
                        title={collection.name}
                        onRootClose={handleRootClose}
                        caption={t("participants_count", {
                            count: peopleCount,
                        })}
                    />
                    <Stack sx={{ gap: "24px", py: "20px", px: "12px" }}>
                        <Stack>
                            <RowButtonGroupTitle
                                icon={<AdminPanelSettingsIcon />}
                            >
                                {t("owner")}
                            </RowButtonGroupTitle>
                            <RowButtonGroup>
                                <RowLabel
                                    startIcon={<Avatar email={ownerEmail} />}
                                    label={isOwner ? t("you") : ownerEmail}
                                />
                            </RowButtonGroup>
                        </Stack>
                        <Stack>
                            <RowButtonGroupTitle icon={<ModeEditIcon />}>
                                {t("collaborators")}
                            </RowButtonGroupTitle>
                            <RowButtonGroup>
                                {collaborators.map((item) => (
                                    <React.Fragment key={item}>
                                        <RowButton
                                            fontWeight="regular"
                                            onClick={() =>
                                                openManageParticipant(item)
                                            }
                                            label={item}
                                            startIcon={<Avatar email={item} />}
                                            endIcon={<ChevronRightIcon />}
                                        />
                                        <RowButtonDivider />
                                    </React.Fragment>
                                ))}

                                <RowButton
                                    startIcon={<AddIcon />}
                                    onClick={openAddCollab}
                                    label={
                                        collaborators?.length
                                            ? t("add_more")
                                            : t("add_collaborators")
                                    }
                                />
                            </RowButtonGroup>
                        </Stack>
                        <Stack>
                            <RowButtonGroupTitle icon={<Photo />}>
                                {t("viewers")}
                            </RowButtonGroupTitle>
                            <RowButtonGroup>
                                {viewers.map((item) => (
                                    <React.Fragment key={item}>
                                        <RowButton
                                            fontWeight="regular"
                                            onClick={() =>
                                                openManageParticipant(item)
                                            }
                                            label={item}
                                            startIcon={<Avatar email={item} />}
                                            endIcon={<ChevronRightIcon />}
                                        />
                                        <RowButtonDivider />
                                    </React.Fragment>
                                ))}
                                <RowButton
                                    startIcon={<AddIcon />}
                                    onClick={openAddViewer}
                                    label={
                                        viewers?.length
                                            ? t("add_more")
                                            : t("add_viewers")
                                    }
                                />
                            </RowButtonGroup>
                        </Stack>
                    </Stack>
                </Stack>
            </NestedSidebarDrawer>
            <ManageParticipant
                collectionUnshare={collectionUnshare}
                open={manageParticipantView}
                collection={collection}
                onRootClose={onRootClose}
                onClose={closeManageParticipant}
                selectedParticipant={selectedParticipant.current}
            />
            <AddParticipant
                open={addParticipantView}
                onClose={closeAddParticipant}
                onRootClose={onRootClose}
                collection={collection}
                type={participantType.current}
            />
        </>
    );
};

interface ManageParticipantProps {
    open: boolean;
    collection: Collection;
    onClose: () => void;
    onRootClose: () => void;
    selectedParticipant: CollectionUser;
    collectionUnshare: (email: string) => Promise<void>;
}

const ManageParticipant: React.FC<ManageParticipantProps> = ({
    collection,
    open,
    onClose,
    onRootClose,
    selectedParticipant,
    collectionUnshare,
}) => {
    const { showMiniDialog } = useBaseContext();
    const galleryContext = useContext(GalleryContext);

    const handleRootClose = () => {
        onClose();
        onRootClose();
    };

    const handleRemove = () => {
        collectionUnshare(selectedParticipant.email);
        onClose();
    };

    const handleRoleChange = (role: string) => () => {
        if (role !== selectedParticipant.role) {
            changeRolePermission(selectedParticipant.email, role);
        }
    };

    const updateCollectionRole = async (selectedEmail, newRole) => {
        try {
            await shareCollection(collection, selectedEmail, newRole);
            selectedParticipant.role = newRole;
            await galleryContext.syncWithRemote(false, true);
        } catch (e) {
            log.error(handleSharingErrors(e), e);
        }
    };

    const changeRolePermission = (selectedEmail, newRole) => {
        let contentText;
        let buttonText;

        if (newRole === "VIEWER") {
            contentText = (
                <Trans
                    i18nKey="change_permission_to_viewer"
                    values={{ selectedEmail }}
                />
            );

            buttonText = t("confirm_convert_to_viewer");
        } else if (newRole === "COLLABORATOR") {
            contentText = t("change_permission_to_collaborator", {
                selectedEmail,
            });
            buttonText = t("confirm_convert_to_collaborator");
        }

        showMiniDialog({
            title: t("change_permission_title"),
            message: contentText,
            continue: {
                text: buttonText,
                color: "critical",
                action: () => updateCollectionRole(selectedEmail, newRole),
            },
        });
    };

    const removeParticipant = () => {
        showMiniDialog({
            title: t("remove_participant_title"),
            message: (
                <Trans
                    i18nKey="remove_participant_message"
                    values={{
                        selectedEmail: selectedParticipant.email,
                    }}
                />
            ),
            continue: {
                text: t("confirm_remove"),
                color: "critical",
                action: handleRemove,
            },
        });
    };

    if (!selectedParticipant) {
        return <></>;
    }

    return (
        <NestedSidebarDrawer
            anchor="right"
            {...{ open, onClose }}
            onRootClose={handleRootClose}
        >
            <Stack sx={{ gap: "4px", py: "12px" }}>
                <Titlebar
                    onClose={onClose}
                    title={t("manage")}
                    onRootClose={handleRootClose}
                    caption={selectedParticipant.email}
                />

                <Stack sx={{ gap: "32px", py: "20px", px: "8px" }}>
                    <Stack>
                        <Typography
                            variant="small"
                            sx={{ color: "text.muted", padding: 1 }}
                        >
                            {t("added_as")}
                        </Typography>

                        <RowButtonGroup>
                            <RowButton
                                fontWeight="regular"
                                onClick={handleRoleChange("COLLABORATOR")}
                                label={"Collaborator"}
                                startIcon={<ModeEditIcon />}
                                endIcon={
                                    selectedParticipant.role ===
                                        "COLLABORATOR" && <DoneIcon />
                                }
                            />
                            <RowButtonDivider />

                            <RowButton
                                fontWeight="regular"
                                onClick={handleRoleChange("VIEWER")}
                                label={"Viewer"}
                                startIcon={<PhotoIcon />}
                                endIcon={
                                    selectedParticipant.role === "VIEWER" && (
                                        <DoneIcon />
                                    )
                                }
                            />
                        </RowButtonGroup>

                        <Typography
                            variant="small"
                            sx={{ color: "text.muted", padding: 1 }}
                        >
                            {t("collaborator_hint")}
                        </Typography>

                        <Stack sx={{ py: "30px" }}>
                            <Typography
                                variant="small"
                                sx={{ color: "text.muted", padding: 1 }}
                            >
                                {t("remove_participant")}
                            </Typography>

                            <RowButtonGroup>
                                <RowButton
                                    color="critical"
                                    fontWeight="regular"
                                    onClick={removeParticipant}
                                    label={"Remove"}
                                    startIcon={<BlockIcon />}
                                />
                            </RowButtonGroup>
                        </Stack>
                    </Stack>
                </Stack>
            </Stack>
        </NestedSidebarDrawer>
    );
};

interface PublicShareProps {
    collection: Collection;
    onRootClose: () => void;
}

const PublicShare: React.FC<PublicShareProps> = ({
    collection,
    onRootClose,
}) => {
    const [publicShareUrl, setPublicShareUrl] = useState<string>(null);
    const [publicShareProp, setPublicShareProp] = useState<PublicURL>(null);
    const {
        show: showPublicLinkCreated,
        props: publicLinkCreatedVisibilityProps,
    } = useModalVisibility();

    useEffect(() => {
        if (collection.publicURLs?.length) {
            setPublicShareProp(collection.publicURLs[0]);
        }
    }, [collection]);

    useEffect(() => {
        if (publicShareProp?.url) {
            appendCollectionKeyToShareURL(
                publicShareProp.url,
                collection.key,
            ).then((url) => setPublicShareUrl(url));
        } else {
            setPublicShareUrl(null);
        }
    }, [publicShareProp]);

    const copyToClipboardHelper = () => {
        navigator.clipboard.writeText(publicShareUrl);
    };

    return (
        <>
            {publicShareProp ? (
                <ManagePublicShare
                    publicShareProp={publicShareProp}
                    setPublicShareProp={setPublicShareProp}
                    collection={collection}
                    publicShareUrl={publicShareUrl}
                    onRootClose={onRootClose}
                    copyToClipboardHelper={copyToClipboardHelper}
                />
            ) : (
                <EnablePublicShareOptions
                    setPublicShareProp={setPublicShareProp}
                    collection={collection}
                    onLinkCreated={showPublicLinkCreated}
                />
            )}
            <PublicLinkCreated
                {...publicLinkCreatedVisibilityProps}
                onCopyLink={copyToClipboardHelper}
            />
        </>
    );
};

interface ManagePublicShareProps {
    publicShareProp: PublicURL;
    collection: Collection;
    setPublicShareProp: SetPublicShareProp;
    onRootClose: () => void;
    publicShareUrl: string;
    copyToClipboardHelper: () => void;
}

const ManagePublicShare: React.FC<ManagePublicShareProps> = ({
    publicShareProp,
    setPublicShareProp,
    collection,
    onRootClose,
    publicShareUrl,
    copyToClipboardHelper,
}) => {
    const [manageShareView, setManageShareView] = useState(false);
    const closeManageShare = () => setManageShareView(false);
    const openManageShare = () => setManageShareView(true);
    return (
        <>
            <Stack>
                <Typography
                    variant="small"
                    sx={{ color: "text.muted", padding: 1 }}
                >
                    <PublicIcon style={{ fontSize: 17, marginRight: 8 }} />
                    {t("public_link_enabled")}
                </Typography>
                <RowButtonGroup>
                    {isLinkExpired(publicShareProp.validTill) ? (
                        <RowButton
                            disabled
                            startIcon={<ErrorOutlineIcon />}
                            color="critical"
                            onClick={openManageShare}
                            label={t("link_expired")}
                        />
                    ) : (
                        <RowButton
                            startIcon={<ContentCopyIcon />}
                            onClick={copyToClipboardHelper}
                            disabled={isLinkExpired(publicShareProp.validTill)}
                            label={t("copy_link")}
                        />
                    )}
                    <RowButtonDivider />
                    <RowButton
                        startIcon={<LinkIcon />}
                        endIcon={<ChevronRightIcon />}
                        onClick={openManageShare}
                        label={t("manage_link")}
                    />
                </RowButtonGroup>
            </Stack>
            <ManagePublicShareOptions
                open={manageShareView}
                onClose={closeManageShare}
                onRootClose={onRootClose}
                publicShareProp={publicShareProp}
                collection={collection}
                setPublicShareProp={setPublicShareProp}
                publicShareUrl={publicShareUrl}
            />
        </>
    );
};

const isLinkExpired = (validTill: number) => {
    return validTill && validTill < Date.now() * 1000;
};

interface ManagePublicShareOptionsProps {
    publicShareProp: PublicURL;
    collection: Collection;
    setPublicShareProp: SetPublicShareProp;
    open: boolean;
    onClose: () => void;
    onRootClose: () => void;
    publicShareUrl: string;
}

const ManagePublicShareOptions: React.FC<ManagePublicShareOptionsProps> = ({
    publicShareProp,
    collection,
    setPublicShareProp,
    open,
    onClose,
    onRootClose,
    publicShareUrl,
}) => {
    const galleryContext = useContext(GalleryContext);

    const [sharableLinkError, setSharableLinkError] = useState(null);

    const handleRootClose = () => {
        onClose();
        onRootClose();
    };

    const updatePublicShareURLHelper = async (req: UpdatePublicURL) => {
        try {
            galleryContext.setBlockingLoad(true);
            const response = await updateShareableURL(req);
            setPublicShareProp(response);
            galleryContext.syncWithRemote(false, true);
        } catch (e) {
            const errorMessage = handleSharingErrors(e);
            setSharableLinkError(errorMessage);
        } finally {
            galleryContext.setBlockingLoad(false);
        }
    };
    const disablePublicSharing = async () => {
        try {
            galleryContext.setBlockingLoad(true);
            await deleteShareableURL(collection);
            setPublicShareProp(null);
            galleryContext.syncWithRemote(false, true);
            onClose();
        } catch (e) {
            const errorMessage = handleSharingErrors(e);
            setSharableLinkError(errorMessage);
        } finally {
            galleryContext.setBlockingLoad(false);
        }
    };

    const copyToClipboardHelper = (text: string) => () => {
        navigator.clipboard.writeText(text);
    };

    return (
        <NestedSidebarDrawer
            anchor="right"
            {...{ open, onClose }}
            onRootClose={handleRootClose}
        >
            <Stack sx={{ gap: "4px", py: "12px" }}>
                <Titlebar
                    onClose={onClose}
                    title={t("share_album")}
                    onRootClose={handleRootClose}
                />
                <Stack sx={{ gap: 3, py: "20px", px: "8px" }}>
                    <ManagePublicCollect
                        collection={collection}
                        publicShareProp={publicShareProp}
                        updatePublicShareURLHelper={updatePublicShareURLHelper}
                    />
                    <ManageLinkExpiry
                        collection={collection}
                        publicShareProp={publicShareProp}
                        updatePublicShareURLHelper={updatePublicShareURLHelper}
                        onRootClose={onRootClose}
                    />
                    <RowButtonGroup>
                        <ManageDeviceLimit
                            collection={collection}
                            publicShareProp={publicShareProp}
                            updatePublicShareURLHelper={
                                updatePublicShareURLHelper
                            }
                            onRootClose={onRootClose}
                        />
                        <RowButtonDivider />
                        <ManageDownloadAccess
                            collection={collection}
                            publicShareProp={publicShareProp}
                            updatePublicShareURLHelper={
                                updatePublicShareURLHelper
                            }
                        />
                        <RowButtonDivider />
                        <ManageLinkPassword
                            collection={collection}
                            publicShareProp={publicShareProp}
                            updatePublicShareURLHelper={
                                updatePublicShareURLHelper
                            }
                        />
                    </RowButtonGroup>
                    <RowButtonGroup>
                        <RowButton
                            startIcon={<ContentCopyIcon />}
                            onClick={copyToClipboardHelper(publicShareUrl)}
                            label={t("copy_link")}
                        />
                    </RowButtonGroup>
                    <RowButtonGroup>
                        <RowButton
                            color="critical"
                            startIcon={<RemoveCircleOutlineIcon />}
                            onClick={disablePublicSharing}
                            label={t("remove_link")}
                        />
                    </RowButtonGroup>
                    {sharableLinkError && (
                        <Typography
                            variant="small"
                            sx={{ color: "critical.main", textAlign: "center" }}
                        >
                            {sharableLinkError}
                        </Typography>
                    )}
                </Stack>
            </Stack>
        </NestedSidebarDrawer>
    );
};

interface ManagePublicCollectProps {
    publicShareProp: PublicURL;
    collection: Collection;
    updatePublicShareURLHelper: (req: UpdatePublicURL) => Promise<void>;
}

const ManagePublicCollect: React.FC<ManagePublicCollectProps> = ({
    publicShareProp,
    updatePublicShareURLHelper,
    collection,
}) => {
    const handleFileDownloadSetting = () => {
        updatePublicShareURLHelper({
            collectionID: collection.id,
            enableCollect: !publicShareProp.enableCollect,
        });
    };

    return (
        <Stack>
            <RowButtonGroup>
                <RowSwitch
                    label={t("allow_adding_photos")}
                    checked={publicShareProp?.enableCollect}
                    onClick={handleFileDownloadSetting}
                />
            </RowButtonGroup>
            <RowButtonGroupHint>
                {t("allow_adding_photos_hint")}
            </RowButtonGroupHint>
        </Stack>
    );
};

interface ManageLinkExpiryProps {
    publicShareProp: PublicURL;
    collection: Collection;
    updatePublicShareURLHelper: (req: UpdatePublicURL) => Promise<void>;
    onRootClose: () => void;
}

const ManageLinkExpiry: React.FC<ManageLinkExpiryProps> = ({
    publicShareProp,
    collection,
    updatePublicShareURLHelper,
    onRootClose,
}) => {
    const updateDeviceExpiry = async (optionFn) => {
        return updatePublicShareURLHelper({
            collectionID: collection.id,
            validTill: optionFn,
        });
    };

    const [shareExpiryOptionsModalView, setShareExpiryOptionsModalView] =
        useState(false);

    const shareExpireOption = useMemo(() => shareExpiryOptions(), []);

    const closeShareExpiryOptionsModalView = () =>
        setShareExpiryOptionsModalView(false);

    const openShareExpiryOptionsModalView = () =>
        setShareExpiryOptionsModalView(true);

    const changeShareExpiryValue = (value: number) => async () => {
        await updateDeviceExpiry(value);
        publicShareProp.validTill = value;
        setShareExpiryOptionsModalView(false);
    };

    const handleRootClose = () => {
        closeShareExpiryOptionsModalView();
        onRootClose();
    };

    return (
        <>
            <RowButtonGroup>
                <RowButton
                    onClick={openShareExpiryOptionsModalView}
                    endIcon={<ChevronRightIcon />}
                    label={t("link_expiry")}
                    color={
                        isLinkExpired(publicShareProp?.validTill)
                            ? "critical"
                            : "primary"
                    }
                    caption={
                        isLinkExpired(publicShareProp?.validTill)
                            ? t("link_expired")
                            : publicShareProp?.validTill
                              ? formatDateTime(
                                    publicShareProp?.validTill / 1000,
                                )
                              : t("never")
                    }
                />
            </RowButtonGroup>
            <NestedSidebarDrawer
                anchor="right"
                open={shareExpiryOptionsModalView}
                onClose={closeShareExpiryOptionsModalView}
                onRootClose={handleRootClose}
            >
                <Stack sx={{ gap: "4px", py: "12px" }}>
                    <Titlebar
                        onClose={closeShareExpiryOptionsModalView}
                        onRootClose={handleRootClose}
                        title={t("link_expiry")}
                    />
                    <Stack sx={{ gap: "32px", py: "20px", px: "8px" }}>
                        <RowButtonGroup>
                            {shareExpireOption.map((item, index) => (
                                <React.Fragment key={item.value()}>
                                    <RowButton
                                        fontWeight="regular"
                                        onClick={changeShareExpiryValue(
                                            item.value(),
                                        )}
                                        label={item.label}
                                    />
                                    {index !== shareExpireOption.length - 1 && (
                                        <RowButtonDivider />
                                    )}
                                </React.Fragment>
                            ))}
                        </RowButtonGroup>
                    </Stack>
                </Stack>
            </NestedSidebarDrawer>
        </>
    );
};

export const shareExpiryOptions = () => [
    { label: t("never"), value: () => 0 },
    { label: t("after_time.hour"), value: () => microsecsAfter("hour") },
    { label: t("after_time.day"), value: () => microsecsAfter("day") },
    { label: t("after_time.week"), value: () => microsecsAfter("week") },
    { label: t("after_time.month"), value: () => microsecsAfter("month") },
    { label: t("after_time.year"), value: () => microsecsAfter("year") },
];

const microsecsAfter = (after: "hour" | "day" | "week" | "month" | "year") => {
    let date = new Date();
    switch (after) {
        case "hour":
            date = new Date(date.getTime() + 60 * 60 * 1000);
            break;
        case "day":
            date.setDate(date.getDate() + 1);
            break;
        case "week":
            date.setDate(date.getDate() + 7);
            break;
        case "month":
            date.setMonth(date.getMonth() + 1);
            break;
        case "year":
            date.setFullYear(date.getFullYear() + 1);
            break;
    }
    return date.getTime() * 1000;
};

interface ManageDeviceLimitProps {
    publicShareProp: PublicURL;
    collection: Collection;
    updatePublicShareURLHelper: (req: UpdatePublicURL) => Promise<void>;
    onRootClose: () => void;
}

const ManageDeviceLimit: React.FC<ManageDeviceLimitProps> = ({
    collection,
    publicShareProp,
    updatePublicShareURLHelper,
    onRootClose,
}) => {
    const updateDeviceLimit = async (newLimit: number) => {
        return updatePublicShareURLHelper({
            collectionID: collection.id,
            deviceLimit: newLimit,
        });
    };
    const [isChangeDeviceLimitVisible, setIsChangeDeviceLimitVisible] =
        useState(false);
    const deviceLimitOptions = useMemo(() => getDeviceLimitOptions(), []);

    const closeDeviceLimitChangeModal = () =>
        setIsChangeDeviceLimitVisible(false);
    const openDeviceLimitChangeModalView = () =>
        setIsChangeDeviceLimitVisible(true);

    const changeDeviceLimitValue = (value: number) => async () => {
        await updateDeviceLimit(value);
        setIsChangeDeviceLimitVisible(false);
    };

    const handleRootClose = () => {
        closeDeviceLimitChangeModal();
        onRootClose();
    };

    return (
        <>
            <RowButton
                label={t("device_limit")}
                caption={
                    publicShareProp.deviceLimit === 0
                        ? t("none")
                        : publicShareProp.deviceLimit.toString()
                }
                onClick={openDeviceLimitChangeModalView}
                endIcon={<ChevronRightIcon />}
            />
            <NestedSidebarDrawer
                anchor="right"
                open={isChangeDeviceLimitVisible}
                onClose={closeDeviceLimitChangeModal}
                onRootClose={handleRootClose}
            >
                <Stack sx={{ gap: "4px", py: "12px" }}>
                    <Titlebar
                        onClose={closeDeviceLimitChangeModal}
                        onRootClose={handleRootClose}
                        title={t("device_limit")}
                    />
                    <Stack sx={{ gap: "32px", py: "20px", px: "8px" }}>
                        <RowButtonGroup>
                            {deviceLimitOptions.map((item, index) => (
                                <React.Fragment key={item.label}>
                                    <RowButton
                                        fontWeight="regular"
                                        onClick={changeDeviceLimitValue(
                                            item.value,
                                        )}
                                        label={item.label}
                                    />
                                    {index !==
                                        deviceLimitOptions.length - 1 && (
                                        <RowButtonDivider />
                                    )}
                                </React.Fragment>
                            ))}
                        </RowButtonGroup>
                    </Stack>
                </Stack>
            </NestedSidebarDrawer>
        </>
    );
};

interface ManageDownloadAccessProps {
    publicShareProp: PublicURL;
    collection: Collection;
    updatePublicShareURLHelper: (req: UpdatePublicURL) => Promise<void>;
}

const ManageDownloadAccess: React.FC<ManageDownloadAccessProps> = ({
    publicShareProp,
    updatePublicShareURLHelper,
    collection,
}) => {
    const { showMiniDialog } = useBaseContext();

    const handleFileDownloadSetting = () => {
        if (publicShareProp.enableDownload) {
            disableFileDownload();
        } else {
            updatePublicShareURLHelper({
                collectionID: collection.id,
                enableDownload: true,
            });
        }
    };

    const disableFileDownload = () => {
        showMiniDialog({
            title: t("disable_file_download"),
            message: <Trans i18nKey={"disable_file_download_message"} />,
            continue: {
                text: t("disable"),
                color: "critical",
                action: () =>
                    updatePublicShareURLHelper({
                        collectionID: collection.id,
                        enableDownload: false,
                    }),
            },
        });
    };
    return (
        <RowSwitch
            label={t("allow_downloads")}
            checked={publicShareProp?.enableDownload ?? true}
            onClick={handleFileDownloadSetting}
        />
    );
};

interface ManageLinkPasswordProps {
    publicShareProp: PublicURL;
    collection: Collection;
    updatePublicShareURLHelper: (req: UpdatePublicURL) => Promise<void>;
}

const ManageLinkPassword: React.FC<ManageLinkPasswordProps> = ({
    collection,
    publicShareProp,
    updatePublicShareURLHelper,
}) => {
    const { showMiniDialog } = useBaseContext();
    const [changePasswordView, setChangePasswordView] = useState(false);

    const closeConfigurePassword = () => setChangePasswordView(false);

    const handlePasswordChangeSetting = async () => {
        if (publicShareProp.passwordEnabled) {
            await confirmDisablePublicUrlPassword();
        } else {
            setChangePasswordView(true);
        }
    };

    const confirmDisablePublicUrlPassword = async () => {
        showMiniDialog({
            title: t("disable_password"),
            message: t("disable_password_message"),
            continue: {
                text: t("disable"),
                color: "critical",
                action: () =>
                    updatePublicShareURLHelper({
                        collectionID: collection.id,
                        disablePassword: true,
                    }),
            },
        });
    };

    return (
        <>
            <RowSwitch
                label={t("password_lock")}
                checked={!!publicShareProp?.passwordEnabled}
                onClick={handlePasswordChangeSetting}
            />
            <PublicLinkSetPassword
                open={changePasswordView}
                onClose={closeConfigurePassword}
                collection={collection}
                publicShareProp={publicShareProp}
                updatePublicShareURLHelper={updatePublicShareURLHelper}
                setChangePasswordView={setChangePasswordView}
            />
        </>
    );
};

function PublicLinkSetPassword({
    open,
    onClose,
    collection,
    publicShareProp,
    updatePublicShareURLHelper,
    setChangePasswordView,
}) {
    const savePassword: SingleInputFormProps["callback"] = async (
        passphrase,
        setFieldError,
    ) => {
        if (passphrase && passphrase.trim().length >= 1) {
            await enablePublicUrlPassword(passphrase);
            setChangePasswordView(false);
            publicShareProp.passwordEnabled = true;
        } else {
            setFieldError("can not be empty");
        }
    };

    const enablePublicUrlPassword = async (password: string) => {
        const cryptoWorker = await sharedCryptoWorker();
        const kekSalt = await cryptoWorker.generateSaltToDeriveKey();
        const kek = await cryptoWorker.deriveInteractiveKey(password, kekSalt);

        return updatePublicShareURLHelper({
            collectionID: collection.id,
            passHash: kek.key,
            nonce: kekSalt,
            opsLimit: kek.opsLimit,
            memLimit: kek.memLimit,
        });
    };
    return (
        <Dialog
            open={open}
            onClose={onClose}
            disablePortal
            slotProps={{
                // We're being shown within the sidebar drawer, so limit the
                // backdrop to only cover the drawer.
                backdrop: { sx: { position: "absolute" } },
                // We're being shown within the sidebar drawer, and also the
                // content of this dialog is lesser than what a normal dialog
                // contains. Use a bespoke padding.
                paper: {
                    sx: { "&&": { padding: "4px" } },
                },
            }}
            sx={{ position: "absolute" }}
            maxWidth={"sm"}
            fullWidth
        >
            <Stack sx={{ gap: 3, p: 1.5 }}>
                <Typography variant="h3" sx={{ px: 1, py: 0.5 }}>
                    {t("password_lock")}
                </Typography>
                <SingleInputForm
                    callback={savePassword}
                    placeholder={t("password")}
                    buttonText={t("lock")}
                    fieldType="password"
                    secondaryButtonAction={onClose}
                    submitButtonProps={{ sx: { mt: 1, mb: 0 } }}
                />
            </Stack>
        </Dialog>
    );
}
