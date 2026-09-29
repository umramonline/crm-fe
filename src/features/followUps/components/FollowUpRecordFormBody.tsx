import { Button, InputFile } from "@adminlte/react";
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
import { CrmFormSection } from "@/shared/components/CrmFormSection";
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
  const imageFieldProps = formFieldProps(formScope, "images", { label: "Resim" });

  return (
    <>
      {headerSummary ? (
        <CrmFormSection bodyClass="py-3">{headerSummary}</CrmFormSection>
      ) : null}

      <CrmFormSection title="Ziyaret Bilgileri">
        <div className="row g-3">
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
      </CrmFormSection>

      <CrmFormSection title="Görüşülen Kişi Bilgileri">
        <div data-follow-up-error-field="meetPeople" tabIndex={-1}>
          {meetPeople.map((person, index) => (
            <CrmFormSection
              key={person.rowKey}
              nested
              title={`Görüşülen Kişi ${index + 1}`}
              className="mb-3"
              bodyClass="pt-2 pb-2"
              tools={
                <Button
                  theme="secondary"
                  size="sm"
                  type="button"
                  disabled={!canRemoveMeetPerson(meetPeople.length)}
                  onClick={() => onRemoveMeetPerson(person.rowKey)}
                >
                  Sil
                </Button>
              }
            >
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
                <CrmFormFieldCol wide>
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
            </CrmFormSection>
          ))}
          {meetPeopleError ? (
            <p className="text-danger small mb-2">{meetPeopleError}</p>
          ) : null}
          <Button theme="primary" size="sm" type="button" onClick={onAddMeetPerson}>
            Kişi Ekle
          </Button>
        </div>
      </CrmFormSection>

      {beforeAgreement}

      <CrmFormSection title="Anlaşma Bilgileri">
        <div className="row g-3">
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
              rows={3}
              value={note}
              data-follow-up-error-field="note"
              onChange={onNoteChange}
              error={noteError}
              hint="En fazla 150 karakter."
            />
          </CrmFormFieldCol>
        </div>
      </CrmFormSection>

      <CrmFormSection title="Resim">
        {existingImages.length > 0 ? (
          <ul className="list-group list-group-flush mb-3">
            {existingImages.map((image) => (
              <li
                key={image.uuid}
                className="list-group-item d-flex align-items-center justify-content-between gap-2 px-0"
              >
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
              </li>
            ))}
          </ul>
        ) : null}
        <InputFile
          id={imageFieldProps.id}
          name={imageFieldProps.name}
          label="Dosya seçin"
          fgroupClass="mb-0"
          className="form-control-sm"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          error={imagesError}
          data-follow-up-error-field="images"
          onChange={(event) => onNewImagesChange(event.target.files)}
        />
        <p className="form-text text-muted mb-0 mt-1">
          JPEG, PNG, JPG, GIF veya WebP. Maksimum 3 resim, toplam 5 MB.
        </p>
        {newImages.length > 0 ? (
          <ul className="list-group list-group-flush mt-3">
            {newImages.map((image, index) => (
              <li
                key={`${image.name}-${image.size}-${index}`}
                className="list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2 px-0"
              >
                <span>{image.name}</span>
                <span className="text-muted small">{formatFileSize(image.size)}</span>
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
      </CrmFormSection>

      {formError ? <p className="text-danger small mb-0">{formError}</p> : null}
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
