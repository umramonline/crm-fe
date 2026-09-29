import { Button } from "@adminlte/react";
import type { ReactNode } from "react";

import {
  followUpAgreementFailureReasons,
  followUpMeetPersonTitles,
  followUpVisitTypes,
} from "@/features/followUps/constants/followUpFormConstants";
import {
  CrmFormFieldCol,
  CrmFormInput,
  CrmFormSelect,
  CrmFormTextarea,
} from "@/shared/components/CrmFormField";
import { formFieldProps } from "@/shared/utils/formFieldProps";

export type FollowUpMeetPersonRow = {
  rowKey: string;
  title: string;
  name: string;
  surname: string;
  phone: string;
  email: string;
};

export type FollowUpExistingImageRow = {
  uuid: string;
  label: string;
};

type FollowUpRecordFormBodyProps = {
  formScope: string;
  headerSummary?: ReactNode;
  beforeAgreement?: ReactNode;
  visitDate: string;
  nextVisitDate: string;
  visitType: string;
  visitDateLabel?: string;
  visitDateReadOnly?: boolean;
  minVisitDate?: string;
  onVisitDateChange?: (value: string) => void;
  onNextVisitDateChange: (value: string) => void;
  onVisitTypeChange: (value: string) => void;
  visitDateError?: string;
  nextVisitDateError?: string;
  visitTypeError?: string;
  meetPeople: FollowUpMeetPersonRow[];
  meetPeopleError?: string;
  meetPersonFieldError?: (rowKey: string, field: string) => string | undefined;
  onMeetPersonChange: (rowKey: string, field: string, value: string) => void;
  onAddMeetPerson: () => void;
  onRemoveMeetPerson: (rowKey: string) => void;
  canRemoveMeetPerson?: (count: number) => boolean;
  agreementReached: boolean;
  agreementFailureReason: string;
  onAgreementReachedChange: (value: boolean) => void;
  onAgreementFailureReasonChange: (value: string) => void;
  agreementFailureReasonError?: string;
  note: string;
  onNoteChange: (value: string) => void;
  noteError?: string;
  existingImages?: FollowUpExistingImageRow[];
  onRemoveExistingImage?: (uuid: string) => void;
  newImages: File[];
  onNewImagesChange: (files: FileList | null) => void;
  onRemoveNewImage?: (index: number) => void;
  imagesError?: string;
  formError?: string;
};

export function FollowUpRecordFormBody({
  formScope,
  headerSummary,
  beforeAgreement,
  visitDate,
  nextVisitDate,
  visitType,
  visitDateLabel = "Görüşme Tarihi*",
  visitDateReadOnly = false,
  minVisitDate,
  onVisitDateChange,
  onNextVisitDateChange,
  onVisitTypeChange,
  visitDateError,
  nextVisitDateError,
  visitTypeError,
  meetPeople,
  meetPeopleError,
  meetPersonFieldError,
  onMeetPersonChange,
  onAddMeetPerson,
  onRemoveMeetPerson,
  canRemoveMeetPerson = (count) => count > 1,
  agreementReached,
  agreementFailureReason,
  onAgreementReachedChange,
  onAgreementFailureReasonChange,
  agreementFailureReasonError,
  note,
  onNoteChange,
  noteError,
  existingImages = [],
  onRemoveExistingImage,
  newImages,
  onNewImagesChange,
  onRemoveNewImage,
  imagesError,
  formError,
}: FollowUpRecordFormBodyProps) {
  const visitMin = minVisitDate ?? visitDate;

  return (
    <>
      {headerSummary}

      <h3 className="task-assign-form-wide">Ziyaret Bilgileri</h3>
      <div className="row g-3 task-assign-form-wide">
        <CrmFormFieldCol>
          <CrmFormInput
            formScope={formScope}
            field="visitDate"
            label={visitDateLabel}
            type="date"
            min={minVisitDate}
            value={visitDate}
            readOnly={visitDateReadOnly}
            disabled={visitDateReadOnly}
            data-follow-up-error-field="visitDate"
            onChange={(value) => onVisitDateChange?.(value)}
            error={visitDateError}
          />
        </CrmFormFieldCol>
        <CrmFormFieldCol>
          <CrmFormInput
            formScope={formScope}
            field="nextVisitDate"
            label="Bir Sonraki Ziyaret Tarihi"
            type="date"
            min={visitMin}
            value={nextVisitDate}
            data-follow-up-error-field="nextVisitDate"
            onChange={onNextVisitDateChange}
            error={nextVisitDateError}
          />
        </CrmFormFieldCol>
        <CrmFormFieldCol>
          <CrmFormSelect
            formScope={formScope}
            field="visitType"
            label="Görüşme Türü*"
            value={visitType}
            data-follow-up-error-field="visitType"
            options={followUpVisitTypes.map((item) => ({
              value: item,
              label: item,
            }))}
            onChange={onVisitTypeChange}
            error={visitTypeError}
          />
        </CrmFormFieldCol>
      </div>

      <h3 className="task-assign-form-wide">Görüşülen Kişi Bilgileri</h3>
      <div
        className="follow-up-meet-people task-assign-form-wide"
        data-follow-up-error-field="meetPeople"
        tabIndex={-1}
      >
        {meetPeople.map((person, index) => (
          <div className="follow-up-meet-person-card" key={person.rowKey}>
            <div className="follow-up-meet-person-header">
              <strong>Görüşülen Kişi {index + 1}</strong>
              <Button
                theme="secondary"
                size="sm"
                type="button"
                disabled={!canRemoveMeetPerson(meetPeople.length)}
                onClick={() => onRemoveMeetPerson(person.rowKey)}
              >
                Sil
              </Button>
            </div>
            <div className="row g-3">
              <CrmFormFieldCol>
                <CrmFormSelect
                  formScope={formScope}
                  field="title"
                  suffix={person.rowKey}
                  label="Görevi*"
                  value={person.title}
                  data-follow-up-error-field={`meetPeople.${person.rowKey}.title`}
                  options={followUpMeetPersonTitles.map((title) => ({
                    value: title,
                    label: title,
                  }))}
                  onChange={(value) => onMeetPersonChange(person.rowKey, "title", value)}
                  error={meetPersonFieldError?.(person.rowKey, "title")}
                />
              </CrmFormFieldCol>
              <CrmFormFieldCol>
                <CrmFormInput
                  formScope={formScope}
                  field="name"
                  suffix={person.rowKey}
                  label="Ad*"
                  maxLength={50}
                  value={person.name}
                  data-follow-up-error-field={`meetPeople.${person.rowKey}.name`}
                  onChange={(value) => onMeetPersonChange(person.rowKey, "name", value)}
                  error={meetPersonFieldError?.(person.rowKey, "name")}
                />
              </CrmFormFieldCol>
              <CrmFormFieldCol>
                <CrmFormInput
                  formScope={formScope}
                  field="surname"
                  suffix={person.rowKey}
                  label="Soyad*"
                  maxLength={50}
                  value={person.surname}
                  data-follow-up-error-field={`meetPeople.${person.rowKey}.surname`}
                  onChange={(value) => onMeetPersonChange(person.rowKey, "surname", value)}
                  error={meetPersonFieldError?.(person.rowKey, "surname")}
                />
              </CrmFormFieldCol>
              <CrmFormFieldCol>
                <CrmFormInput
                  formScope={formScope}
                  field="phone"
                  suffix={person.rowKey}
                  label="Telefon*"
                  isPhone
                  maxLength={11}
                  value={person.phone}
                  data-follow-up-error-field={`meetPeople.${person.rowKey}.phone`}
                  onChange={(value) => onMeetPersonChange(person.rowKey, "phone", value)}
                  error={meetPersonFieldError?.(person.rowKey, "phone")}
                />
              </CrmFormFieldCol>
              <CrmFormFieldCol>
                <CrmFormInput
                  formScope={formScope}
                  field="email"
                  suffix={person.rowKey}
                  label="Eposta"
                  type="email"
                  maxLength={100}
                  value={person.email}
                  data-follow-up-error-field={`meetPeople.${person.rowKey}.email`}
                  onChange={(value) => onMeetPersonChange(person.rowKey, "email", value)}
                  error={meetPersonFieldError?.(person.rowKey, "email")}
                />
              </CrmFormFieldCol>
            </div>
          </div>
        ))}
        {meetPeopleError ? (
          <span className="customer-field-error">{meetPeopleError}</span>
        ) : null}
        <Button theme="primary" size="sm" type="button" onClick={onAddMeetPerson}>
          Kişi Ekle
        </Button>
      </div>

      {beforeAgreement}

      <h3 className="task-assign-form-wide">Anlaşma Bilgileri</h3>
      <div className="row g-3 task-assign-form-wide">
        <CrmFormFieldCol>
          <CrmFormSelect
            formScope={formScope}
            field="agreementReached"
            label="Anlaşma Sağlandı mı?"
            hidePlaceholder
            value={agreementReached ? "true" : "false"}
            options={[
              { value: "false", label: "Hayır" },
              { value: "true", label: "Evet" },
            ]}
            onChange={(value) => onAgreementReachedChange(value === "true")}
          />
        </CrmFormFieldCol>
        {!agreementReached ? (
          <CrmFormFieldCol>
            <CrmFormSelect
              formScope={formScope}
              field="agreementFailureReason"
              label="Anlaşamama Sebebi*"
              value={agreementFailureReason}
              data-follow-up-error-field="agreementFailureReason"
              options={followUpAgreementFailureReasons.map((reason) => ({
                value: reason,
                label: reason,
              }))}
              onChange={onAgreementFailureReasonChange}
              error={agreementFailureReasonError}
            />
          </CrmFormFieldCol>
        ) : null}
        <CrmFormFieldCol wide>
          <CrmFormTextarea
            formScope={formScope}
            field="note"
            label="Not"
            maxLength={150}
            value={note}
            data-follow-up-error-field="note"
            onChange={onNoteChange}
            error={noteError}
          />
        </CrmFormFieldCol>
      </div>

      <h3 className="task-assign-form-wide">Resim</h3>
      {existingImages.length > 0 ? (
        <div className="follow-up-upload-list task-assign-form-wide mb-2">
          {existingImages.map((image) => (
            <div key={image.uuid} className="d-flex align-items-center gap-2">
              <span>{image.label}</span>
              {onRemoveExistingImage ? (
                <Button
                  theme="secondary"
                  size="sm"
                  type="button"
                  onClick={() => onRemoveExistingImage(image.uuid)}
                >
                  Sil
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <label className="field-label task-assign-form-wide">
        <span className="follow-up-upload-box">
          <input
            {...formFieldProps(formScope, "images", { label: "Resim" })}
            className="follow-up-upload-input"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            data-follow-up-error-field="images"
            onChange={(event) => onNewImagesChange(event.target.files)}
          />
          <span className="follow-up-upload-title">Resim seçmek için tıklayın</span>
          <span className="follow-up-upload-help">
            JPEG, PNG, JPG, GIF veya WebP. Maksimum 3 resim, toplam 5 MB.
          </span>
        </span>
        {imagesError ? <span className="customer-field-error">{imagesError}</span> : null}
      </label>
      {newImages.length > 0 ? (
        <ul className="follow-up-upload-list task-assign-form-wide">
          {newImages.map((image, index) => (
            <li key={`${image.name}-${image.size}-${index}`}>
              <span>{image.name}</span>
              <span>{formatFileSize(image.size)}</span>
              {onRemoveNewImage ? (
                <Button
                  theme="secondary"
                  size="sm"
                  type="button"
                  onClick={() => onRemoveNewImage(index)}
                >
                  Sil
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {formError ? (
        <p className="customer-field-error task-assign-form-wide">{formError}</p>
      ) : null}
    </>
  );
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
