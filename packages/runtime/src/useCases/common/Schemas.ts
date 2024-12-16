export const LoadPeerTokenAnonymousRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/LoadPeerTokenAnonymousRequest",
    "definitions": {
        "LoadPeerTokenAnonymousRequest": {
            "type": "object",
            "properties": {
                "password": {
                    "type": "string"
                },
                "reference": {
                    "$ref": "#/definitions/TokenReferenceString"
                }
            },
            "required": [
                "reference"
            ],
            "additionalProperties": false
        },
        "TokenReferenceString": {
            "type": "string",
            "pattern": "VE9L.{84}"
        }
    }
}

export const GetAttributeListenerRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetAttributeListenerRequest",
    "definitions": {
        "GetAttributeListenerRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/AttributeListenerIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "AttributeListenerIdString": {
            "type": "string",
            "pattern": "ATL[A-Za-z0-9]{17}"
        }
    }
}

export const ChangeDefaultRepositoryAttributeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ChangeDefaultRepositoryAttributeRequest",
    "definitions": {
        "ChangeDefaultRepositoryAttributeRequest": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "$ref": "#/definitions/AttributeIdString"
                }
            },
            "required": [
                "attributeId"
            ],
            "additionalProperties": false
        },
        "AttributeIdString": {
            "type": "string",
            "pattern": "ATT[A-Za-z0-9]{17}"
        }
    }
}

export const AcceptIncomingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/AcceptIncomingRequestRequest",
    "definitions": {
        "AcceptIncomingRequestRequest": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "anyOf": [
                            {
                                "$ref": "#/definitions/DecideRequestItemParametersJSON"
                            },
                            {
                                "$ref": "#/definitions/DecideRequestItemGroupParametersJSON"
                            }
                        ]
                    }
                },
                "requestId": {
                    "type": "string"
                }
            },
            "required": [
                "items",
                "requestId"
            ]
        },
        "DecideRequestItemParametersJSON": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AcceptRequestItemParametersJSON"
                },
                {
                    "$ref": "#/definitions/RejectRequestItemParametersJSON"
                }
            ]
        },
        "AcceptRequestItemParametersJSON": {
            "type": "object",
            "properties": {
                "accept": {
                    "type": "boolean",
                    "const": true
                }
            },
            "required": [
                "accept"
            ],
            "additionalProperties": false
        },
        "RejectRequestItemParametersJSON": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string"
                },
                "code": {
                    "type": "string"
                },
                "accept": {
                    "type": "boolean",
                    "const": false
                }
            },
            "required": [
                "accept"
            ],
            "additionalProperties": false
        },
        "DecideRequestItemGroupParametersJSON": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/DecideRequestItemParametersJSON"
                    }
                }
            },
            "required": [
                "items"
            ],
            "additionalProperties": false
        }
    }
}

export const CanCreateOutgoingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CanCreateOutgoingRequestRequest",
    "definitions": {
        "CanCreateOutgoingRequestRequest": {
            "type": "object",
            "properties": {
                "peer": {
                    "$ref": "#/definitions/AddressString"
                },
                "content": {
                    "type": "object",
                    "properties": {
                        "@context": {
                            "type": "string"
                        },
                        "metadata": {
                            "type": "object",
                            "description": "This property can be used to add some arbitrary metadata to this request. The content of this property will be copied into the response on the side of the recipient."
                        },
                        "description": {
                            "type": "string",
                            "description": "The human-readable description of this Request."
                        },
                        "title": {
                            "type": "string",
                            "description": "The human-readable title of this Request."
                        },
                        "items": {
                            "type": "array",
                            "items": {
                                "anyOf": [
                                    {
                                        "$ref": "#/definitions/RequestItemGroupJSON"
                                    },
                                    {
                                        "$ref": "#/definitions/RequestItemJSONDerivations"
                                    }
                                ]
                            },
                            "description": "The items of the Request. Can be either a single  {@link  RequestItemJSONDerivations RequestItem }  or a  {@link  RequestItemGroupJSON RequestItemGroup } , which itself can contain further  {@link  RequestItemJSONDerivations RequestItems } ."
                        },
                        "expiresAt": {
                            "type": "string",
                            "description": "The point in time the request is considered obsolete either technically (e.g. the request is no longer valid or its response is no longer accepted) or from a business perspective (e.g. the request is no longer of interest).",
                            "default": "undefined - the request won't expire"
                        }
                    },
                    "required": [
                        "items"
                    ],
                    "additionalProperties": false
                }
            },
            "required": [
                "content"
            ],
            "additionalProperties": false
        },
        "RequestItemGroupJSON": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/RequestItemJSONDerivations"
                    },
                    "description": "The items of this group."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this group. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the group content as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this group."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this group."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RequestItemGroup"
                }
            },
            "required": [
                "@type",
                "items"
            ],
            "additionalProperties": false,
            "description": "A RequestItemGroup can be used to group one or more RequestItems. This is useful if you want to visually group RequestItems on the UI and give them a common `title` or `description`."
        },
        "RequestItemJSONDerivations": {
            "anyOf": [
                {
                    "$ref": "#/definitions/RequestItemJSON"
                },
                {
                    "$ref": "#/definitions/CreateAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/DeleteAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/ShareAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/ProposeAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/ReadAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/ConsentRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/AuthenticationRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/FreeTextRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/RegisterAttributeListenerRequestItemJSON"
                }
            ]
        },
        "RequestItemJSON": {
            "type": "object",
            "properties": {
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "CreateAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "CreateAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeJSON": {
            "type": "object",
            "properties": {
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
                },
                "isTechnical": {
                    "type": "boolean"
                },
                "key": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Relationship.Json"
                },
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttribute"
                }
            },
            "required": [
                "@type",
                "confidentiality",
                "key",
                "owner",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Relationship.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/ProprietaryBooleanJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryCountryJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryEMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFloatJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryHEXColorJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryIntegerJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryLanguageJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryPhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryStringJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryURLJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryJSONJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryXMLJSON"
                },
                {
                    "$ref": "#/definitions/ConsentJSON"
                }
            ]
        },
        "ProprietaryBooleanJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ValueHintsOverrideJSON": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "displayName": {
                    "type": "string"
                },
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                }
            },
            "required": [
                "key",
                "displayName"
            ],
            "additionalProperties": false
        },
        "ValueHintsJSON": {
            "type": "object",
            "properties": {
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "ProprietaryCountryJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryEMailAddressJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFileReferenceJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFloatJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryHEXColorJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryIntegerJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryLanguageJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryPhoneNumberJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryStringJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryURLJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryJSONJSON": {
            "type": "object",
            "properties": {
                "value": {},
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ConsentJSON": {
            "type": "object",
            "properties": {
                "link": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "consent"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeConfidentiality": {
            "type": "string",
            "enum": [
                "public",
                "private",
                "protected"
            ]
        },
        "IdentityAttributeJSON": {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Identity.Json"
                },
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityAttribute"
                }
            },
            "required": [
                "@type",
                "owner",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.Json"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.Json"
                }
            ]
        },
        "AttributeValues.Identity.Editable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationJSON"
                },
                {
                    "$ref": "#/definitions/BirthDateJSON"
                },
                {
                    "$ref": "#/definitions/BirthNameJSON"
                },
                {
                    "$ref": "#/definitions/BirthPlaceJSON"
                },
                {
                    "$ref": "#/definitions/CitizenshipJSON"
                },
                {
                    "$ref": "#/definitions/CommunicationLanguageJSON"
                },
                {
                    "$ref": "#/definitions/DeliveryBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/DisplayNameJSON"
                },
                {
                    "$ref": "#/definitions/EMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/FaxNumberJSON"
                },
                {
                    "$ref": "#/definitions/IdentityFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/JobTitleJSON"
                },
                {
                    "$ref": "#/definitions/NationalityJSON"
                },
                {
                    "$ref": "#/definitions/PersonNameJSON"
                },
                {
                    "$ref": "#/definitions/PhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/PostOfficeBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/PseudonymJSON"
                },
                {
                    "$ref": "#/definitions/SexJSON"
                },
                {
                    "$ref": "#/definitions/StreetAddressJSON"
                },
                {
                    "$ref": "#/definitions/WebsiteJSON"
                }
            ]
        },
        "AffiliationJSON": {
            "type": "object",
            "properties": {
                "unit": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                }
            },
            "required": [
                "@type",
                "organization"
            ],
            "additionalProperties": false
        },
        "BirthDateJSON": {
            "type": "object",
            "properties": {
                "year": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "day": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                }
            },
            "required": [
                "@type",
                "day",
                "month",
                "year"
            ],
            "additionalProperties": false
        },
        "BirthNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                }
            },
            "required": [
                "@type",
                "city",
                "country"
            ],
            "additionalProperties": false
        },
        "CitizenshipJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "deliveryBoxId",
                "recipient",
                "userId",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "DisplayNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "honorificPrefix": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                }
            },
            "required": [
                "@type",
                "givenName",
                "surname"
            ],
            "additionalProperties": false
        },
        "PhoneNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                }
            },
            "required": [
                "@type",
                "boxId",
                "city",
                "country",
                "recipient",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "PseudonymJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SexJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Sex"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "houseNo",
                "recipient",
                "street",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "WebsiteJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Website"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Uneditable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationOrganizationJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationRoleJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationUnitJSON"
                },
                {
                    "$ref": "#/definitions/BirthCityJSON"
                },
                {
                    "$ref": "#/definitions/BirthCountryJSON"
                },
                {
                    "$ref": "#/definitions/BirthDayJSON"
                },
                {
                    "$ref": "#/definitions/BirthMonthJSON"
                },
                {
                    "$ref": "#/definitions/BirthStateJSON"
                },
                {
                    "$ref": "#/definitions/BirthYearJSON"
                },
                {
                    "$ref": "#/definitions/CityJSON"
                },
                {
                    "$ref": "#/definitions/CountryJSON"
                },
                {
                    "$ref": "#/definitions/GivenNameJSON"
                },
                {
                    "$ref": "#/definitions/HonorificPrefixJSON"
                },
                {
                    "$ref": "#/definitions/HonorificSuffixJSON"
                },
                {
                    "$ref": "#/definitions/HouseNumberJSON"
                },
                {
                    "$ref": "#/definitions/MiddleNameJSON"
                },
                {
                    "$ref": "#/definitions/SchematizedXMLJSON"
                },
                {
                    "$ref": "#/definitions/StateJSON"
                },
                {
                    "$ref": "#/definitions/StreetJSON"
                },
                {
                    "$ref": "#/definitions/SurnameJSON"
                },
                {
                    "$ref": "#/definitions/ZipCodeJSON"
                }
            ]
        },
        "AffiliationOrganizationJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthDayJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthMonthJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number",
                    "enum": [
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                        9,
                        10,
                        11,
                        12
                    ],
                    "description": "Month values: 1 (january) - 12 (december)"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthStateJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthState"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthYearJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "City"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CountryJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Country"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StateJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "State"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Street"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Surname"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "DeleteAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "type": "string"
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DeleteAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "attributeId",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "ShareAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "thirdPartyAddress": {
                    "type": "string"
                },
                "sourceAttributeId": {
                    "type": "string"
                },
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ShareAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "mustBeAccepted",
                "sourceAttributeId"
            ],
            "additionalProperties": false
        },
        "ProposeAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
                },
                "query": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/IQLQueryJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProposeAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "mustBeAccepted",
                "query"
            ],
            "additionalProperties": false
        },
        "IdentityAttributeQueryJSON": {
            "type": "object",
            "properties": {
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityAttributeQuery"
                }
            },
            "required": [
                "@type",
                "valueType"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.TypeName": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.TypeName"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.TypeName"
                }
            ]
        },
        "AttributeValues.Identity.Editable.TypeName": {
            "type": "string",
            "enum": [
                "Affiliation",
                "BirthDate",
                "BirthName",
                "BirthPlace",
                "Citizenship",
                "CommunicationLanguage",
                "DeliveryBoxAddress",
                "DisplayName",
                "EMailAddress",
                "FaxNumber",
                "IdentityFileReference",
                "SchematizedXML",
                "JobTitle",
                "Nationality",
                "PersonName",
                "PhoneNumber",
                "PostOfficeBoxAddress",
                "Pseudonym",
                "Sex",
                "StreetAddress",
                "Website"
            ]
        },
        "AttributeValues.Identity.Uneditable.TypeName": {
            "type": "string",
            "enum": [
                "AffiliationOrganization",
                "AffiliationRole",
                "AffiliationUnit",
                "BirthCity",
                "BirthCountry",
                "BirthDay",
                "BirthMonth",
                "BirthState",
                "BirthYear",
                "City",
                "Country",
                "GivenName",
                "HonorificPrefix",
                "HonorificSuffix",
                "HouseNumber",
                "MiddleName",
                "SchematizedXML",
                "State",
                "Street",
                "Surname",
                "ZipCode"
            ]
        },
        "RelationshipAttributeQueryJSON": {
            "type": "object",
            "properties": {
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "attributeCreationHints": {
                    "$ref": "#/definitions/RelationshipAttributeCreationHintsJSON"
                },
                "owner": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttributeQuery"
                }
            },
            "required": [
                "@type",
                "attributeCreationHints",
                "key",
                "owner"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeCreationHintsJSON": {
            "type": "object",
            "properties": {
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
                },
                "valueHints": {
                    "$ref": "#/definitions/ValueHintsJSON"
                },
                "description": {
                    "type": "string"
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Relationship.TypeName"
                },
                "title": {
                    "type": "string"
                }
            },
            "required": [
                "title",
                "valueType",
                "confidentiality"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Relationship.TypeName": {
            "type": "string",
            "enum": [
                "ProprietaryBoolean",
                "ProprietaryCountry",
                "ProprietaryEMailAddress",
                "ProprietaryFileReference",
                "ProprietaryFloat",
                "ProprietaryHEXColor",
                "ProprietaryInteger",
                "ProprietaryLanguage",
                "ProprietaryPhoneNumber",
                "ProprietaryString",
                "ProprietaryURL",
                "ProprietaryJSON",
                "ProprietaryXML",
                "Consent"
            ]
        },
        "IQLQueryJSON": {
            "type": "object",
            "properties": {
                "attributeCreationHints": {
                    "$ref": "#/definitions/IQLQueryCreationHintsJSON"
                },
                "queryString": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IQLQuery"
                }
            },
            "required": [
                "@type",
                "queryString"
            ],
            "additionalProperties": false
        },
        "IQLQueryCreationHintsJSON": {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                }
            },
            "required": [
                "valueType"
            ],
            "additionalProperties": false
        },
        "ReadAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "query": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/IQLQueryJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ReadAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted",
                "query"
            ],
            "additionalProperties": false
        },
        "ThirdPartyRelationshipAttributeQueryJSON": {
            "type": "object",
            "properties": {
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "thirdParty": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "owner": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryOwner"
                        },
                        {
                            "type": "string",
                            "const": "thirdParty"
                        },
                        {
                            "type": "string",
                            "const": "recipient"
                        },
                        {
                            "type": "string",
                            "const": ""
                        }
                    ]
                },
                "key": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ThirdPartyRelationshipAttributeQuery"
                }
            },
            "required": [
                "@type",
                "key",
                "owner",
                "thirdParty"
            ],
            "additionalProperties": false
        },
        "ThirdPartyRelationshipAttributeQueryOwner": {
            "type": "string",
            "enum": [
                "thirdParty",
                "recipient",
                ""
            ]
        },
        "ConsentRequestItemJSON": {
            "type": "object",
            "properties": {
                "link": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ConsentRequestItem"
                }
            },
            "required": [
                "@type",
                "consent",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "AuthenticationRequestItemJSON": {
            "type": "object",
            "properties": {
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AuthenticationRequestItem"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "FreeTextRequestItemJSON": {
            "type": "object",
            "properties": {
                "freeText": {
                    "type": "string"
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "FreeTextRequestItem"
                }
            },
            "required": [
                "@type",
                "freeText",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "RegisterAttributeListenerRequestItemJSON": {
            "type": "object",
            "properties": {
                "query": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RegisterAttributeListenerRequestItem"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted",
                "query"
            ],
            "additionalProperties": false
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const RejectIncomingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/RejectIncomingRequestRequest",
    "definitions": {
        "RejectIncomingRequestRequest": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "anyOf": [
                            {
                                "$ref": "#/definitions/DecideRequestItemParametersJSON"
                            },
                            {
                                "$ref": "#/definitions/DecideRequestItemGroupParametersJSON"
                            }
                        ]
                    }
                },
                "requestId": {
                    "type": "string"
                }
            },
            "required": [
                "items",
                "requestId"
            ]
        },
        "DecideRequestItemParametersJSON": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AcceptRequestItemParametersJSON"
                },
                {
                    "$ref": "#/definitions/RejectRequestItemParametersJSON"
                }
            ]
        },
        "AcceptRequestItemParametersJSON": {
            "type": "object",
            "properties": {
                "accept": {
                    "type": "boolean",
                    "const": true
                }
            },
            "required": [
                "accept"
            ],
            "additionalProperties": false
        },
        "RejectRequestItemParametersJSON": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string"
                },
                "code": {
                    "type": "string"
                },
                "accept": {
                    "type": "boolean",
                    "const": false
                }
            },
            "required": [
                "accept"
            ],
            "additionalProperties": false
        },
        "DecideRequestItemGroupParametersJSON": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/DecideRequestItemParametersJSON"
                    }
                }
            },
            "required": [
                "items"
            ],
            "additionalProperties": false
        }
    }
}

export const CheckPrerequisitesOfIncomingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CheckPrerequisitesOfIncomingRequestRequest",
    "definitions": {
        "CheckPrerequisitesOfIncomingRequestRequest": {
            "type": "object",
            "properties": {
                "requestId": {
                    "$ref": "#/definitions/RequestIdString"
                }
            },
            "required": [
                "requestId"
            ],
            "additionalProperties": false
        },
        "RequestIdString": {
            "type": "string",
            "pattern": "REQ[A-Za-z0-9]{17}"
        }
    }
}

export const CompleteIncomingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CompleteIncomingRequestRequest",
    "definitions": {
        "CompleteIncomingRequestRequest": {
            "type": "object",
            "properties": {
                "responseSourceId": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/MessageIdString"
                        },
                        {
                            "$ref": "#/definitions/RelationshipIdString"
                        }
                    ]
                },
                "requestId": {
                    "$ref": "#/definitions/RequestIdString"
                }
            },
            "required": [
                "requestId"
            ],
            "additionalProperties": false
        },
        "RequestIdString": {
            "type": "string",
            "pattern": "REQ[A-Za-z0-9]{17}"
        },
        "MessageIdString": {
            "type": "string",
            "pattern": "MSG[A-Za-z0-9]{17}"
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const CompleteOutgoingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CompleteOutgoingRequestRequest",
    "definitions": {
        "CompleteOutgoingRequestRequest": {
            "type": "object",
            "properties": {
                "messageId": {
                    "$ref": "#/definitions/MessageIdString"
                },
                "receivedResponse": {
                    "$ref": "#/definitions/ResponseJSON"
                }
            },
            "required": [
                "receivedResponse",
                "messageId"
            ],
            "additionalProperties": false
        },
        "ResponseJSON": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "anyOf": [
                            {
                                "$ref": "#/definitions/ResponseItemGroupJSON"
                            },
                            {
                                "$ref": "#/definitions/ResponseItemJSONDerivations"
                            }
                        ]
                    }
                },
                "requestId": {
                    "type": "string"
                },
                "result": {
                    "$ref": "#/definitions/ResponseResult"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Response"
                }
            },
            "required": [
                "@type",
                "items",
                "requestId",
                "result"
            ],
            "additionalProperties": false
        },
        "ResponseResult": {
            "type": "string",
            "enum": [
                "Accepted",
                "Rejected"
            ]
        },
        "ResponseItemGroupJSON": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ResponseItemJSONDerivations"
                    }
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ResponseItemGroup"
                }
            },
            "required": [
                "@type",
                "items"
            ],
            "additionalProperties": false
        },
        "ResponseItemJSONDerivations": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AcceptResponseItemJSONDerivations"
                },
                {
                    "$ref": "#/definitions/RejectResponseItemJSONDerivations"
                },
                {
                    "$ref": "#/definitions/ErrorResponseItemJSONDerivations"
                }
            ]
        },
        "AcceptResponseItemJSONDerivations": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/AttributeAlreadySharedAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/AttributeSuccessionAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/CreateAttributeAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/ShareAttributeAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/ProposeAttributeAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/ReadAttributeAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/RegisterAttributeListenerAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/FreeTextAcceptResponseItemJSON"
                }
            ]
        },
        "AcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "result"
            ],
            "additionalProperties": false
        },
        "AttributeAlreadySharedAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AttributeAlreadySharedAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "attributeId",
                "result"
            ],
            "additionalProperties": false
        },
        "AttributeSuccessionAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "successorContent": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
                },
                "successorId": {
                    "type": "string"
                },
                "predecessorId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AttributeSuccessionAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "predecessorId",
                "result",
                "successorContent",
                "successorId"
            ],
            "additionalProperties": false
        },
        "IdentityAttributeJSON": {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Identity.Json"
                },
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityAttribute"
                }
            },
            "required": [
                "@type",
                "owner",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.Json"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.Json"
                }
            ]
        },
        "AttributeValues.Identity.Editable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationJSON"
                },
                {
                    "$ref": "#/definitions/BirthDateJSON"
                },
                {
                    "$ref": "#/definitions/BirthNameJSON"
                },
                {
                    "$ref": "#/definitions/BirthPlaceJSON"
                },
                {
                    "$ref": "#/definitions/CitizenshipJSON"
                },
                {
                    "$ref": "#/definitions/CommunicationLanguageJSON"
                },
                {
                    "$ref": "#/definitions/DeliveryBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/DisplayNameJSON"
                },
                {
                    "$ref": "#/definitions/EMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/FaxNumberJSON"
                },
                {
                    "$ref": "#/definitions/IdentityFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/JobTitleJSON"
                },
                {
                    "$ref": "#/definitions/NationalityJSON"
                },
                {
                    "$ref": "#/definitions/PersonNameJSON"
                },
                {
                    "$ref": "#/definitions/PhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/PostOfficeBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/PseudonymJSON"
                },
                {
                    "$ref": "#/definitions/SexJSON"
                },
                {
                    "$ref": "#/definitions/StreetAddressJSON"
                },
                {
                    "$ref": "#/definitions/WebsiteJSON"
                }
            ]
        },
        "AffiliationJSON": {
            "type": "object",
            "properties": {
                "unit": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                }
            },
            "required": [
                "@type",
                "organization"
            ],
            "additionalProperties": false
        },
        "BirthDateJSON": {
            "type": "object",
            "properties": {
                "year": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "day": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                }
            },
            "required": [
                "@type",
                "day",
                "month",
                "year"
            ],
            "additionalProperties": false
        },
        "BirthNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                }
            },
            "required": [
                "@type",
                "city",
                "country"
            ],
            "additionalProperties": false
        },
        "CitizenshipJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "deliveryBoxId",
                "recipient",
                "userId",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "DisplayNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "honorificPrefix": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                }
            },
            "required": [
                "@type",
                "givenName",
                "surname"
            ],
            "additionalProperties": false
        },
        "PhoneNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                }
            },
            "required": [
                "@type",
                "boxId",
                "city",
                "country",
                "recipient",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "PseudonymJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SexJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Sex"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "houseNo",
                "recipient",
                "street",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "WebsiteJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Website"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Uneditable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationOrganizationJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationRoleJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationUnitJSON"
                },
                {
                    "$ref": "#/definitions/BirthCityJSON"
                },
                {
                    "$ref": "#/definitions/BirthCountryJSON"
                },
                {
                    "$ref": "#/definitions/BirthDayJSON"
                },
                {
                    "$ref": "#/definitions/BirthMonthJSON"
                },
                {
                    "$ref": "#/definitions/BirthStateJSON"
                },
                {
                    "$ref": "#/definitions/BirthYearJSON"
                },
                {
                    "$ref": "#/definitions/CityJSON"
                },
                {
                    "$ref": "#/definitions/CountryJSON"
                },
                {
                    "$ref": "#/definitions/GivenNameJSON"
                },
                {
                    "$ref": "#/definitions/HonorificPrefixJSON"
                },
                {
                    "$ref": "#/definitions/HonorificSuffixJSON"
                },
                {
                    "$ref": "#/definitions/HouseNumberJSON"
                },
                {
                    "$ref": "#/definitions/MiddleNameJSON"
                },
                {
                    "$ref": "#/definitions/SchematizedXMLJSON"
                },
                {
                    "$ref": "#/definitions/StateJSON"
                },
                {
                    "$ref": "#/definitions/StreetJSON"
                },
                {
                    "$ref": "#/definitions/SurnameJSON"
                },
                {
                    "$ref": "#/definitions/ZipCodeJSON"
                }
            ]
        },
        "AffiliationOrganizationJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthDayJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthMonthJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number",
                    "enum": [
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                        9,
                        10,
                        11,
                        12
                    ],
                    "description": "Month values: 1 (january) - 12 (december)"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthStateJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthState"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthYearJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "City"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CountryJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Country"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StateJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "State"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Street"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Surname"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeJSON": {
            "type": "object",
            "properties": {
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
                },
                "isTechnical": {
                    "type": "boolean"
                },
                "key": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Relationship.Json"
                },
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttribute"
                }
            },
            "required": [
                "@type",
                "confidentiality",
                "key",
                "owner",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Relationship.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/ProprietaryBooleanJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryCountryJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryEMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFloatJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryHEXColorJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryIntegerJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryLanguageJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryPhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryStringJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryURLJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryJSONJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryXMLJSON"
                },
                {
                    "$ref": "#/definitions/ConsentJSON"
                }
            ]
        },
        "ProprietaryBooleanJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ValueHintsOverrideJSON": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "displayName": {
                    "type": "string"
                },
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                }
            },
            "required": [
                "key",
                "displayName"
            ],
            "additionalProperties": false
        },
        "ValueHintsJSON": {
            "type": "object",
            "properties": {
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "ProprietaryCountryJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryEMailAddressJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFileReferenceJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFloatJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryHEXColorJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryIntegerJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryLanguageJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryPhoneNumberJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryStringJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryURLJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryJSONJSON": {
            "type": "object",
            "properties": {
                "value": {},
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ConsentJSON": {
            "type": "object",
            "properties": {
                "link": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "consent"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeConfidentiality": {
            "type": "string",
            "enum": [
                "public",
                "private",
                "protected"
            ]
        },
        "CreateAttributeAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "CreateAttributeAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "attributeId",
                "result"
            ],
            "additionalProperties": false
        },
        "ShareAttributeAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ShareAttributeAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "attributeId",
                "result"
            ],
            "additionalProperties": false
        },
        "ProposeAttributeAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
                },
                "attributeId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProposeAttributeAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "attributeId",
                "result"
            ],
            "additionalProperties": false
        },
        "ReadAttributeAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "thirdPartyAddress": {
                    "type": "string"
                },
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
                },
                "attributeId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ReadAttributeAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "attributeId",
                "result"
            ],
            "additionalProperties": false
        },
        "RegisterAttributeListenerAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "listenerId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RegisterAttributeListenerAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "listenerId",
                "result"
            ],
            "additionalProperties": false
        },
        "FreeTextAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "freeText": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "FreeTextAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "freeText",
                "result"
            ],
            "additionalProperties": false
        },
        "RejectResponseItemJSONDerivations": {
            "$ref": "#/definitions/RejectResponseItemJSON"
        },
        "RejectResponseItemJSON": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string"
                },
                "code": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Rejected"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RejectResponseItem"
                }
            },
            "required": [
                "@type",
                "result"
            ],
            "additionalProperties": false
        },
        "ErrorResponseItemJSONDerivations": {
            "$ref": "#/definitions/ErrorResponseItemJSON"
        },
        "ErrorResponseItemJSON": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string"
                },
                "code": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Error"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ErrorResponseItem"
                }
            },
            "required": [
                "@type",
                "code",
                "message",
                "result"
            ],
            "additionalProperties": false
        },
        "MessageIdString": {
            "type": "string",
            "pattern": "MSG[A-Za-z0-9]{17}"
        }
    }
}

export const CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseRequest",
    "definitions": {
        "CreateAndCompleteOutgoingRequestFromRelationshipTemplateResponseRequest": {
            "type": "object",
            "properties": {
                "response": {
                    "$ref": "#/definitions/ResponseJSON"
                },
                "responseSourceId": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/RelationshipIdString"
                        },
                        {
                            "$ref": "#/definitions/MessageIdString"
                        }
                    ]
                },
                "templateId": {
                    "$ref": "#/definitions/RelationshipTemplateIdString"
                }
            },
            "required": [
                "templateId",
                "responseSourceId",
                "response"
            ],
            "additionalProperties": false
        },
        "RelationshipTemplateIdString": {
            "type": "string",
            "pattern": "RLT[A-Za-z0-9]{17}"
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        },
        "MessageIdString": {
            "type": "string",
            "pattern": "MSG[A-Za-z0-9]{17}"
        },
        "ResponseJSON": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "anyOf": [
                            {
                                "$ref": "#/definitions/ResponseItemGroupJSON"
                            },
                            {
                                "$ref": "#/definitions/ResponseItemJSONDerivations"
                            }
                        ]
                    }
                },
                "requestId": {
                    "type": "string"
                },
                "result": {
                    "$ref": "#/definitions/ResponseResult"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Response"
                }
            },
            "required": [
                "@type",
                "items",
                "requestId",
                "result"
            ],
            "additionalProperties": false
        },
        "ResponseResult": {
            "type": "string",
            "enum": [
                "Accepted",
                "Rejected"
            ]
        },
        "ResponseItemGroupJSON": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ResponseItemJSONDerivations"
                    }
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ResponseItemGroup"
                }
            },
            "required": [
                "@type",
                "items"
            ],
            "additionalProperties": false
        },
        "ResponseItemJSONDerivations": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AcceptResponseItemJSONDerivations"
                },
                {
                    "$ref": "#/definitions/RejectResponseItemJSONDerivations"
                },
                {
                    "$ref": "#/definitions/ErrorResponseItemJSONDerivations"
                }
            ]
        },
        "AcceptResponseItemJSONDerivations": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/AttributeAlreadySharedAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/AttributeSuccessionAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/CreateAttributeAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/ShareAttributeAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/ProposeAttributeAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/ReadAttributeAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/RegisterAttributeListenerAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/FreeTextAcceptResponseItemJSON"
                }
            ]
        },
        "AcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "result"
            ],
            "additionalProperties": false
        },
        "AttributeAlreadySharedAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AttributeAlreadySharedAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "attributeId",
                "result"
            ],
            "additionalProperties": false
        },
        "AttributeSuccessionAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "successorContent": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
                },
                "successorId": {
                    "type": "string"
                },
                "predecessorId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AttributeSuccessionAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "predecessorId",
                "result",
                "successorContent",
                "successorId"
            ],
            "additionalProperties": false
        },
        "IdentityAttributeJSON": {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Identity.Json"
                },
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityAttribute"
                }
            },
            "required": [
                "@type",
                "owner",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.Json"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.Json"
                }
            ]
        },
        "AttributeValues.Identity.Editable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationJSON"
                },
                {
                    "$ref": "#/definitions/BirthDateJSON"
                },
                {
                    "$ref": "#/definitions/BirthNameJSON"
                },
                {
                    "$ref": "#/definitions/BirthPlaceJSON"
                },
                {
                    "$ref": "#/definitions/CitizenshipJSON"
                },
                {
                    "$ref": "#/definitions/CommunicationLanguageJSON"
                },
                {
                    "$ref": "#/definitions/DeliveryBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/DisplayNameJSON"
                },
                {
                    "$ref": "#/definitions/EMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/FaxNumberJSON"
                },
                {
                    "$ref": "#/definitions/IdentityFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/JobTitleJSON"
                },
                {
                    "$ref": "#/definitions/NationalityJSON"
                },
                {
                    "$ref": "#/definitions/PersonNameJSON"
                },
                {
                    "$ref": "#/definitions/PhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/PostOfficeBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/PseudonymJSON"
                },
                {
                    "$ref": "#/definitions/SexJSON"
                },
                {
                    "$ref": "#/definitions/StreetAddressJSON"
                },
                {
                    "$ref": "#/definitions/WebsiteJSON"
                }
            ]
        },
        "AffiliationJSON": {
            "type": "object",
            "properties": {
                "unit": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                }
            },
            "required": [
                "@type",
                "organization"
            ],
            "additionalProperties": false
        },
        "BirthDateJSON": {
            "type": "object",
            "properties": {
                "year": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "day": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                }
            },
            "required": [
                "@type",
                "day",
                "month",
                "year"
            ],
            "additionalProperties": false
        },
        "BirthNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                }
            },
            "required": [
                "@type",
                "city",
                "country"
            ],
            "additionalProperties": false
        },
        "CitizenshipJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "deliveryBoxId",
                "recipient",
                "userId",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "DisplayNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "honorificPrefix": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                }
            },
            "required": [
                "@type",
                "givenName",
                "surname"
            ],
            "additionalProperties": false
        },
        "PhoneNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                }
            },
            "required": [
                "@type",
                "boxId",
                "city",
                "country",
                "recipient",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "PseudonymJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SexJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Sex"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "houseNo",
                "recipient",
                "street",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "WebsiteJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Website"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Uneditable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationOrganizationJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationRoleJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationUnitJSON"
                },
                {
                    "$ref": "#/definitions/BirthCityJSON"
                },
                {
                    "$ref": "#/definitions/BirthCountryJSON"
                },
                {
                    "$ref": "#/definitions/BirthDayJSON"
                },
                {
                    "$ref": "#/definitions/BirthMonthJSON"
                },
                {
                    "$ref": "#/definitions/BirthStateJSON"
                },
                {
                    "$ref": "#/definitions/BirthYearJSON"
                },
                {
                    "$ref": "#/definitions/CityJSON"
                },
                {
                    "$ref": "#/definitions/CountryJSON"
                },
                {
                    "$ref": "#/definitions/GivenNameJSON"
                },
                {
                    "$ref": "#/definitions/HonorificPrefixJSON"
                },
                {
                    "$ref": "#/definitions/HonorificSuffixJSON"
                },
                {
                    "$ref": "#/definitions/HouseNumberJSON"
                },
                {
                    "$ref": "#/definitions/MiddleNameJSON"
                },
                {
                    "$ref": "#/definitions/SchematizedXMLJSON"
                },
                {
                    "$ref": "#/definitions/StateJSON"
                },
                {
                    "$ref": "#/definitions/StreetJSON"
                },
                {
                    "$ref": "#/definitions/SurnameJSON"
                },
                {
                    "$ref": "#/definitions/ZipCodeJSON"
                }
            ]
        },
        "AffiliationOrganizationJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthDayJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthMonthJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number",
                    "enum": [
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                        9,
                        10,
                        11,
                        12
                    ],
                    "description": "Month values: 1 (january) - 12 (december)"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthStateJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthState"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthYearJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "City"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CountryJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Country"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StateJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "State"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Street"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Surname"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeJSON": {
            "type": "object",
            "properties": {
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
                },
                "isTechnical": {
                    "type": "boolean"
                },
                "key": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Relationship.Json"
                },
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttribute"
                }
            },
            "required": [
                "@type",
                "confidentiality",
                "key",
                "owner",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Relationship.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/ProprietaryBooleanJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryCountryJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryEMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFloatJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryHEXColorJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryIntegerJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryLanguageJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryPhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryStringJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryURLJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryJSONJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryXMLJSON"
                },
                {
                    "$ref": "#/definitions/ConsentJSON"
                }
            ]
        },
        "ProprietaryBooleanJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ValueHintsOverrideJSON": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "displayName": {
                    "type": "string"
                },
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                }
            },
            "required": [
                "key",
                "displayName"
            ],
            "additionalProperties": false
        },
        "ValueHintsJSON": {
            "type": "object",
            "properties": {
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "ProprietaryCountryJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryEMailAddressJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFileReferenceJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFloatJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryHEXColorJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryIntegerJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryLanguageJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryPhoneNumberJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryStringJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryURLJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryJSONJSON": {
            "type": "object",
            "properties": {
                "value": {},
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ConsentJSON": {
            "type": "object",
            "properties": {
                "link": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "consent"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeConfidentiality": {
            "type": "string",
            "enum": [
                "public",
                "private",
                "protected"
            ]
        },
        "CreateAttributeAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "CreateAttributeAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "attributeId",
                "result"
            ],
            "additionalProperties": false
        },
        "ShareAttributeAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ShareAttributeAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "attributeId",
                "result"
            ],
            "additionalProperties": false
        },
        "ProposeAttributeAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
                },
                "attributeId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProposeAttributeAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "attributeId",
                "result"
            ],
            "additionalProperties": false
        },
        "ReadAttributeAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "thirdPartyAddress": {
                    "type": "string"
                },
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
                },
                "attributeId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ReadAttributeAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "attributeId",
                "result"
            ],
            "additionalProperties": false
        },
        "RegisterAttributeListenerAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "listenerId": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RegisterAttributeListenerAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "listenerId",
                "result"
            ],
            "additionalProperties": false
        },
        "FreeTextAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "freeText": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "FreeTextAcceptResponseItem"
                }
            },
            "required": [
                "@type",
                "freeText",
                "result"
            ],
            "additionalProperties": false
        },
        "RejectResponseItemJSONDerivations": {
            "$ref": "#/definitions/RejectResponseItemJSON"
        },
        "RejectResponseItemJSON": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string"
                },
                "code": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Rejected"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RejectResponseItem"
                }
            },
            "required": [
                "@type",
                "result"
            ],
            "additionalProperties": false
        },
        "ErrorResponseItemJSONDerivations": {
            "$ref": "#/definitions/ErrorResponseItemJSON"
        },
        "ErrorResponseItemJSON": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string"
                },
                "code": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Error"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ErrorResponseItem"
                }
            },
            "required": [
                "@type",
                "code",
                "message",
                "result"
            ],
            "additionalProperties": false
        }
    }
}

export const CreateOutgoingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateOutgoingRequestRequest",
    "definitions": {
        "CreateOutgoingRequestRequest": {
            "type": "object",
            "properties": {
                "peer": {
                    "$ref": "#/definitions/AddressString"
                },
                "content": {
                    "type": "object",
                    "properties": {
                        "@context": {
                            "type": "string"
                        },
                        "metadata": {
                            "type": "object",
                            "description": "This property can be used to add some arbitrary metadata to this request. The content of this property will be copied into the response on the side of the recipient."
                        },
                        "description": {
                            "type": "string",
                            "description": "The human-readable description of this Request."
                        },
                        "title": {
                            "type": "string",
                            "description": "The human-readable title of this Request."
                        },
                        "items": {
                            "type": "array",
                            "items": {
                                "anyOf": [
                                    {
                                        "$ref": "#/definitions/RequestItemGroupJSON"
                                    },
                                    {
                                        "$ref": "#/definitions/RequestItemJSONDerivations"
                                    }
                                ]
                            },
                            "description": "The items of the Request. Can be either a single  {@link  RequestItemJSONDerivations RequestItem }  or a  {@link  RequestItemGroupJSON RequestItemGroup } , which itself can contain further  {@link  RequestItemJSONDerivations RequestItems } ."
                        },
                        "expiresAt": {
                            "type": "string",
                            "description": "The point in time the request is considered obsolete either technically (e.g. the request is no longer valid or its response is no longer accepted) or from a business perspective (e.g. the request is no longer of interest).",
                            "default": "undefined - the request won't expire"
                        }
                    },
                    "required": [
                        "items"
                    ],
                    "additionalProperties": false
                }
            },
            "required": [
                "content",
                "peer"
            ],
            "additionalProperties": false
        },
        "RequestItemGroupJSON": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/RequestItemJSONDerivations"
                    },
                    "description": "The items of this group."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this group. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the group content as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this group."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this group."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RequestItemGroup"
                }
            },
            "required": [
                "@type",
                "items"
            ],
            "additionalProperties": false,
            "description": "A RequestItemGroup can be used to group one or more RequestItems. This is useful if you want to visually group RequestItems on the UI and give them a common `title` or `description`."
        },
        "RequestItemJSONDerivations": {
            "anyOf": [
                {
                    "$ref": "#/definitions/RequestItemJSON"
                },
                {
                    "$ref": "#/definitions/CreateAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/DeleteAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/ShareAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/ProposeAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/ReadAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/ConsentRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/AuthenticationRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/FreeTextRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/RegisterAttributeListenerRequestItemJSON"
                }
            ]
        },
        "RequestItemJSON": {
            "type": "object",
            "properties": {
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "CreateAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "CreateAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeJSON": {
            "type": "object",
            "properties": {
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
                },
                "isTechnical": {
                    "type": "boolean"
                },
                "key": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Relationship.Json"
                },
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttribute"
                }
            },
            "required": [
                "@type",
                "confidentiality",
                "key",
                "owner",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Relationship.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/ProprietaryBooleanJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryCountryJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryEMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFloatJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryHEXColorJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryIntegerJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryLanguageJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryPhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryStringJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryURLJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryJSONJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryXMLJSON"
                },
                {
                    "$ref": "#/definitions/ConsentJSON"
                }
            ]
        },
        "ProprietaryBooleanJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ValueHintsOverrideJSON": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "displayName": {
                    "type": "string"
                },
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                }
            },
            "required": [
                "key",
                "displayName"
            ],
            "additionalProperties": false
        },
        "ValueHintsJSON": {
            "type": "object",
            "properties": {
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "ProprietaryCountryJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryEMailAddressJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFileReferenceJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFloatJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryHEXColorJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryIntegerJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryLanguageJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryPhoneNumberJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryStringJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryURLJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryJSONJSON": {
            "type": "object",
            "properties": {
                "value": {},
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ConsentJSON": {
            "type": "object",
            "properties": {
                "link": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "consent"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeConfidentiality": {
            "type": "string",
            "enum": [
                "public",
                "private",
                "protected"
            ]
        },
        "IdentityAttributeJSON": {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Identity.Json"
                },
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityAttribute"
                }
            },
            "required": [
                "@type",
                "owner",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.Json"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.Json"
                }
            ]
        },
        "AttributeValues.Identity.Editable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationJSON"
                },
                {
                    "$ref": "#/definitions/BirthDateJSON"
                },
                {
                    "$ref": "#/definitions/BirthNameJSON"
                },
                {
                    "$ref": "#/definitions/BirthPlaceJSON"
                },
                {
                    "$ref": "#/definitions/CitizenshipJSON"
                },
                {
                    "$ref": "#/definitions/CommunicationLanguageJSON"
                },
                {
                    "$ref": "#/definitions/DeliveryBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/DisplayNameJSON"
                },
                {
                    "$ref": "#/definitions/EMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/FaxNumberJSON"
                },
                {
                    "$ref": "#/definitions/IdentityFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/JobTitleJSON"
                },
                {
                    "$ref": "#/definitions/NationalityJSON"
                },
                {
                    "$ref": "#/definitions/PersonNameJSON"
                },
                {
                    "$ref": "#/definitions/PhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/PostOfficeBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/PseudonymJSON"
                },
                {
                    "$ref": "#/definitions/SexJSON"
                },
                {
                    "$ref": "#/definitions/StreetAddressJSON"
                },
                {
                    "$ref": "#/definitions/WebsiteJSON"
                }
            ]
        },
        "AffiliationJSON": {
            "type": "object",
            "properties": {
                "unit": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                }
            },
            "required": [
                "@type",
                "organization"
            ],
            "additionalProperties": false
        },
        "BirthDateJSON": {
            "type": "object",
            "properties": {
                "year": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "day": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                }
            },
            "required": [
                "@type",
                "day",
                "month",
                "year"
            ],
            "additionalProperties": false
        },
        "BirthNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                }
            },
            "required": [
                "@type",
                "city",
                "country"
            ],
            "additionalProperties": false
        },
        "CitizenshipJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "deliveryBoxId",
                "recipient",
                "userId",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "DisplayNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "honorificPrefix": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                }
            },
            "required": [
                "@type",
                "givenName",
                "surname"
            ],
            "additionalProperties": false
        },
        "PhoneNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                }
            },
            "required": [
                "@type",
                "boxId",
                "city",
                "country",
                "recipient",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "PseudonymJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SexJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Sex"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "houseNo",
                "recipient",
                "street",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "WebsiteJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Website"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Uneditable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationOrganizationJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationRoleJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationUnitJSON"
                },
                {
                    "$ref": "#/definitions/BirthCityJSON"
                },
                {
                    "$ref": "#/definitions/BirthCountryJSON"
                },
                {
                    "$ref": "#/definitions/BirthDayJSON"
                },
                {
                    "$ref": "#/definitions/BirthMonthJSON"
                },
                {
                    "$ref": "#/definitions/BirthStateJSON"
                },
                {
                    "$ref": "#/definitions/BirthYearJSON"
                },
                {
                    "$ref": "#/definitions/CityJSON"
                },
                {
                    "$ref": "#/definitions/CountryJSON"
                },
                {
                    "$ref": "#/definitions/GivenNameJSON"
                },
                {
                    "$ref": "#/definitions/HonorificPrefixJSON"
                },
                {
                    "$ref": "#/definitions/HonorificSuffixJSON"
                },
                {
                    "$ref": "#/definitions/HouseNumberJSON"
                },
                {
                    "$ref": "#/definitions/MiddleNameJSON"
                },
                {
                    "$ref": "#/definitions/SchematizedXMLJSON"
                },
                {
                    "$ref": "#/definitions/StateJSON"
                },
                {
                    "$ref": "#/definitions/StreetJSON"
                },
                {
                    "$ref": "#/definitions/SurnameJSON"
                },
                {
                    "$ref": "#/definitions/ZipCodeJSON"
                }
            ]
        },
        "AffiliationOrganizationJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthDayJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthMonthJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number",
                    "enum": [
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                        9,
                        10,
                        11,
                        12
                    ],
                    "description": "Month values: 1 (january) - 12 (december)"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthStateJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthState"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthYearJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "City"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CountryJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Country"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StateJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "State"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Street"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Surname"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "DeleteAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "type": "string"
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DeleteAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "attributeId",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "ShareAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "thirdPartyAddress": {
                    "type": "string"
                },
                "sourceAttributeId": {
                    "type": "string"
                },
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ShareAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "mustBeAccepted",
                "sourceAttributeId"
            ],
            "additionalProperties": false
        },
        "ProposeAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
                },
                "query": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/IQLQueryJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProposeAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "mustBeAccepted",
                "query"
            ],
            "additionalProperties": false
        },
        "IdentityAttributeQueryJSON": {
            "type": "object",
            "properties": {
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityAttributeQuery"
                }
            },
            "required": [
                "@type",
                "valueType"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.TypeName": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.TypeName"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.TypeName"
                }
            ]
        },
        "AttributeValues.Identity.Editable.TypeName": {
            "type": "string",
            "enum": [
                "Affiliation",
                "BirthDate",
                "BirthName",
                "BirthPlace",
                "Citizenship",
                "CommunicationLanguage",
                "DeliveryBoxAddress",
                "DisplayName",
                "EMailAddress",
                "FaxNumber",
                "IdentityFileReference",
                "SchematizedXML",
                "JobTitle",
                "Nationality",
                "PersonName",
                "PhoneNumber",
                "PostOfficeBoxAddress",
                "Pseudonym",
                "Sex",
                "StreetAddress",
                "Website"
            ]
        },
        "AttributeValues.Identity.Uneditable.TypeName": {
            "type": "string",
            "enum": [
                "AffiliationOrganization",
                "AffiliationRole",
                "AffiliationUnit",
                "BirthCity",
                "BirthCountry",
                "BirthDay",
                "BirthMonth",
                "BirthState",
                "BirthYear",
                "City",
                "Country",
                "GivenName",
                "HonorificPrefix",
                "HonorificSuffix",
                "HouseNumber",
                "MiddleName",
                "SchematizedXML",
                "State",
                "Street",
                "Surname",
                "ZipCode"
            ]
        },
        "RelationshipAttributeQueryJSON": {
            "type": "object",
            "properties": {
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "attributeCreationHints": {
                    "$ref": "#/definitions/RelationshipAttributeCreationHintsJSON"
                },
                "owner": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttributeQuery"
                }
            },
            "required": [
                "@type",
                "attributeCreationHints",
                "key",
                "owner"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeCreationHintsJSON": {
            "type": "object",
            "properties": {
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
                },
                "valueHints": {
                    "$ref": "#/definitions/ValueHintsJSON"
                },
                "description": {
                    "type": "string"
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Relationship.TypeName"
                },
                "title": {
                    "type": "string"
                }
            },
            "required": [
                "title",
                "valueType",
                "confidentiality"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Relationship.TypeName": {
            "type": "string",
            "enum": [
                "ProprietaryBoolean",
                "ProprietaryCountry",
                "ProprietaryEMailAddress",
                "ProprietaryFileReference",
                "ProprietaryFloat",
                "ProprietaryHEXColor",
                "ProprietaryInteger",
                "ProprietaryLanguage",
                "ProprietaryPhoneNumber",
                "ProprietaryString",
                "ProprietaryURL",
                "ProprietaryJSON",
                "ProprietaryXML",
                "Consent"
            ]
        },
        "IQLQueryJSON": {
            "type": "object",
            "properties": {
                "attributeCreationHints": {
                    "$ref": "#/definitions/IQLQueryCreationHintsJSON"
                },
                "queryString": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IQLQuery"
                }
            },
            "required": [
                "@type",
                "queryString"
            ],
            "additionalProperties": false
        },
        "IQLQueryCreationHintsJSON": {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                }
            },
            "required": [
                "valueType"
            ],
            "additionalProperties": false
        },
        "ReadAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "query": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/IQLQueryJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ReadAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted",
                "query"
            ],
            "additionalProperties": false
        },
        "ThirdPartyRelationshipAttributeQueryJSON": {
            "type": "object",
            "properties": {
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "thirdParty": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "owner": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryOwner"
                        },
                        {
                            "type": "string",
                            "const": "thirdParty"
                        },
                        {
                            "type": "string",
                            "const": "recipient"
                        },
                        {
                            "type": "string",
                            "const": ""
                        }
                    ]
                },
                "key": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ThirdPartyRelationshipAttributeQuery"
                }
            },
            "required": [
                "@type",
                "key",
                "owner",
                "thirdParty"
            ],
            "additionalProperties": false
        },
        "ThirdPartyRelationshipAttributeQueryOwner": {
            "type": "string",
            "enum": [
                "thirdParty",
                "recipient",
                ""
            ]
        },
        "ConsentRequestItemJSON": {
            "type": "object",
            "properties": {
                "link": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ConsentRequestItem"
                }
            },
            "required": [
                "@type",
                "consent",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "AuthenticationRequestItemJSON": {
            "type": "object",
            "properties": {
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AuthenticationRequestItem"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "FreeTextRequestItemJSON": {
            "type": "object",
            "properties": {
                "freeText": {
                    "type": "string"
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "FreeTextRequestItem"
                }
            },
            "required": [
                "@type",
                "freeText",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "RegisterAttributeListenerRequestItemJSON": {
            "type": "object",
            "properties": {
                "query": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RegisterAttributeListenerRequestItem"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted",
                "query"
            ],
            "additionalProperties": false
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const DiscardOutgoingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DiscardOutgoingRequestRequest",
    "definitions": {
        "DiscardOutgoingRequestRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/RequestIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "RequestIdString": {
            "type": "string",
            "pattern": "REQ[A-Za-z0-9]{17}"
        }
    }
}

export const GetIncomingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetIncomingRequestRequest",
    "definitions": {
        "GetIncomingRequestRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/RequestIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "RequestIdString": {
            "type": "string",
            "pattern": "REQ[A-Za-z0-9]{17}"
        }
    }
}

export const GetIncomingRequestsRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetIncomingRequestsRequest",
    "definitions": {
        "GetIncomingRequestsRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "$ref": "#/definitions/GetIncomingRequestsRequestQuery"
                }
            },
            "additionalProperties": false
        },
        "GetIncomingRequestsRequestQuery": {
            "type": "object",
            "properties": {
                "response.content.items.items.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "response.content.items.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "response.content.result": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "response.source.reference": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "response.source.type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "response.createdAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "source.reference": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "source.type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.items.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.expiresAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "status": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "peer": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "id": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                }
            },
            "additionalProperties": false
        }
    }
}

export const GetOutgoingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetOutgoingRequestRequest",
    "definitions": {
        "GetOutgoingRequestRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/RequestIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "RequestIdString": {
            "type": "string",
            "pattern": "REQ[A-Za-z0-9]{17}"
        }
    }
}

export const GetOutgoingRequestsRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetOutgoingRequestsRequest",
    "definitions": {
        "GetOutgoingRequestsRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "$ref": "#/definitions/GetOutgoingRequestsRequestQuery"
                }
            },
            "additionalProperties": false
        },
        "GetOutgoingRequestsRequestQuery": {
            "type": "object",
            "properties": {
                "response.content.items.items.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "response.content.items.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "response.content.result": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "response.source.reference": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "response.source.type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "response.createdAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "source.reference": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "source.type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.items.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.expiresAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "status": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "peer": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "id": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                }
            },
            "additionalProperties": false
        }
    }
}

export const ReceivedIncomingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ReceivedIncomingRequestRequest",
    "definitions": {
        "ReceivedIncomingRequestRequest": {
            "type": "object",
            "properties": {
                "requestSourceId": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/MessageIdString"
                        },
                        {
                            "$ref": "#/definitions/RelationshipTemplateIdString"
                        }
                    ]
                },
                "receivedRequest": {
                    "$ref": "#/definitions/RequestJSON"
                }
            },
            "required": [
                "receivedRequest",
                "requestSourceId"
            ],
            "additionalProperties": false
        },
        "RequestJSON": {
            "type": "object",
            "properties": {
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this request. The content of this property will be copied into the response on the side of the recipient."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this Request."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this Request."
                },
                "items": {
                    "type": "array",
                    "items": {
                        "anyOf": [
                            {
                                "$ref": "#/definitions/RequestItemGroupJSON"
                            },
                            {
                                "$ref": "#/definitions/RequestItemJSONDerivations"
                            }
                        ]
                    },
                    "description": "The items of the Request. Can be either a single  {@link  RequestItemJSONDerivations RequestItem }  or a  {@link  RequestItemGroupJSON RequestItemGroup } , which itself can contain further  {@link  RequestItemJSONDerivations RequestItems } ."
                },
                "expiresAt": {
                    "type": "string",
                    "description": "The point in time the request is considered obsolete either technically (e.g. the request is no longer valid or its response is no longer accepted) or from a business perspective (e.g. the request is no longer of interest).",
                    "default": "undefined - the request won't expire"
                },
                "id": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Request"
                }
            },
            "required": [
                "@type",
                "items"
            ],
            "additionalProperties": false
        },
        "RequestItemGroupJSON": {
            "type": "object",
            "properties": {
                "items": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/RequestItemJSONDerivations"
                    },
                    "description": "The items of this group."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this group. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the group content as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this group."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this group."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RequestItemGroup"
                }
            },
            "required": [
                "@type",
                "items"
            ],
            "additionalProperties": false,
            "description": "A RequestItemGroup can be used to group one or more RequestItems. This is useful if you want to visually group RequestItems on the UI and give them a common `title` or `description`."
        },
        "RequestItemJSONDerivations": {
            "anyOf": [
                {
                    "$ref": "#/definitions/RequestItemJSON"
                },
                {
                    "$ref": "#/definitions/CreateAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/DeleteAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/ShareAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/ProposeAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/ReadAttributeRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/ConsentRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/AuthenticationRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/FreeTextRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/RegisterAttributeListenerRequestItemJSON"
                }
            ]
        },
        "RequestItemJSON": {
            "type": "object",
            "properties": {
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "CreateAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "CreateAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeJSON": {
            "type": "object",
            "properties": {
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
                },
                "isTechnical": {
                    "type": "boolean"
                },
                "key": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Relationship.Json"
                },
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttribute"
                }
            },
            "required": [
                "@type",
                "confidentiality",
                "key",
                "owner",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Relationship.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/ProprietaryBooleanJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryCountryJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryEMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFloatJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryHEXColorJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryIntegerJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryLanguageJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryPhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryStringJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryURLJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryJSONJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryXMLJSON"
                },
                {
                    "$ref": "#/definitions/ConsentJSON"
                }
            ]
        },
        "ProprietaryBooleanJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ValueHintsOverrideJSON": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "displayName": {
                    "type": "string"
                },
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                }
            },
            "required": [
                "key",
                "displayName"
            ],
            "additionalProperties": false
        },
        "ValueHintsJSON": {
            "type": "object",
            "properties": {
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "ProprietaryCountryJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryEMailAddressJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFileReferenceJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFloatJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryHEXColorJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryIntegerJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryLanguageJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryPhoneNumberJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryStringJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryURLJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryJSONJSON": {
            "type": "object",
            "properties": {
                "value": {},
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ConsentJSON": {
            "type": "object",
            "properties": {
                "link": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "consent"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeConfidentiality": {
            "type": "string",
            "enum": [
                "public",
                "private",
                "protected"
            ]
        },
        "IdentityAttributeJSON": {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Identity.Json"
                },
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityAttribute"
                }
            },
            "required": [
                "@type",
                "owner",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.Json"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.Json"
                }
            ]
        },
        "AttributeValues.Identity.Editable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationJSON"
                },
                {
                    "$ref": "#/definitions/BirthDateJSON"
                },
                {
                    "$ref": "#/definitions/BirthNameJSON"
                },
                {
                    "$ref": "#/definitions/BirthPlaceJSON"
                },
                {
                    "$ref": "#/definitions/CitizenshipJSON"
                },
                {
                    "$ref": "#/definitions/CommunicationLanguageJSON"
                },
                {
                    "$ref": "#/definitions/DeliveryBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/DisplayNameJSON"
                },
                {
                    "$ref": "#/definitions/EMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/FaxNumberJSON"
                },
                {
                    "$ref": "#/definitions/IdentityFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/JobTitleJSON"
                },
                {
                    "$ref": "#/definitions/NationalityJSON"
                },
                {
                    "$ref": "#/definitions/PersonNameJSON"
                },
                {
                    "$ref": "#/definitions/PhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/PostOfficeBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/PseudonymJSON"
                },
                {
                    "$ref": "#/definitions/SexJSON"
                },
                {
                    "$ref": "#/definitions/StreetAddressJSON"
                },
                {
                    "$ref": "#/definitions/WebsiteJSON"
                }
            ]
        },
        "AffiliationJSON": {
            "type": "object",
            "properties": {
                "unit": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                }
            },
            "required": [
                "@type",
                "organization"
            ],
            "additionalProperties": false
        },
        "BirthDateJSON": {
            "type": "object",
            "properties": {
                "year": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "day": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                }
            },
            "required": [
                "@type",
                "day",
                "month",
                "year"
            ],
            "additionalProperties": false
        },
        "BirthNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                }
            },
            "required": [
                "@type",
                "city",
                "country"
            ],
            "additionalProperties": false
        },
        "CitizenshipJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "deliveryBoxId",
                "recipient",
                "userId",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "DisplayNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "honorificPrefix": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                }
            },
            "required": [
                "@type",
                "givenName",
                "surname"
            ],
            "additionalProperties": false
        },
        "PhoneNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                }
            },
            "required": [
                "@type",
                "boxId",
                "city",
                "country",
                "recipient",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "PseudonymJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SexJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Sex"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "houseNo",
                "recipient",
                "street",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "WebsiteJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Website"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Uneditable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationOrganizationJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationRoleJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationUnitJSON"
                },
                {
                    "$ref": "#/definitions/BirthCityJSON"
                },
                {
                    "$ref": "#/definitions/BirthCountryJSON"
                },
                {
                    "$ref": "#/definitions/BirthDayJSON"
                },
                {
                    "$ref": "#/definitions/BirthMonthJSON"
                },
                {
                    "$ref": "#/definitions/BirthStateJSON"
                },
                {
                    "$ref": "#/definitions/BirthYearJSON"
                },
                {
                    "$ref": "#/definitions/CityJSON"
                },
                {
                    "$ref": "#/definitions/CountryJSON"
                },
                {
                    "$ref": "#/definitions/GivenNameJSON"
                },
                {
                    "$ref": "#/definitions/HonorificPrefixJSON"
                },
                {
                    "$ref": "#/definitions/HonorificSuffixJSON"
                },
                {
                    "$ref": "#/definitions/HouseNumberJSON"
                },
                {
                    "$ref": "#/definitions/MiddleNameJSON"
                },
                {
                    "$ref": "#/definitions/SchematizedXMLJSON"
                },
                {
                    "$ref": "#/definitions/StateJSON"
                },
                {
                    "$ref": "#/definitions/StreetJSON"
                },
                {
                    "$ref": "#/definitions/SurnameJSON"
                },
                {
                    "$ref": "#/definitions/ZipCodeJSON"
                }
            ]
        },
        "AffiliationOrganizationJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthDayJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthMonthJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number",
                    "enum": [
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                        9,
                        10,
                        11,
                        12
                    ],
                    "description": "Month values: 1 (january) - 12 (december)"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthStateJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthState"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthYearJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "City"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CountryJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Country"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StateJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "State"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Street"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Surname"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "DeleteAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "type": "string"
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DeleteAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "attributeId",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "ShareAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "thirdPartyAddress": {
                    "type": "string"
                },
                "sourceAttributeId": {
                    "type": "string"
                },
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ShareAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "mustBeAccepted",
                "sourceAttributeId"
            ],
            "additionalProperties": false
        },
        "ProposeAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
                },
                "query": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/IQLQueryJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProposeAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "attribute",
                "mustBeAccepted",
                "query"
            ],
            "additionalProperties": false
        },
        "IdentityAttributeQueryJSON": {
            "type": "object",
            "properties": {
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityAttributeQuery"
                }
            },
            "required": [
                "@type",
                "valueType"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.TypeName": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.TypeName"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.TypeName"
                }
            ]
        },
        "AttributeValues.Identity.Editable.TypeName": {
            "type": "string",
            "enum": [
                "Affiliation",
                "BirthDate",
                "BirthName",
                "BirthPlace",
                "Citizenship",
                "CommunicationLanguage",
                "DeliveryBoxAddress",
                "DisplayName",
                "EMailAddress",
                "FaxNumber",
                "IdentityFileReference",
                "SchematizedXML",
                "JobTitle",
                "Nationality",
                "PersonName",
                "PhoneNumber",
                "PostOfficeBoxAddress",
                "Pseudonym",
                "Sex",
                "StreetAddress",
                "Website"
            ]
        },
        "AttributeValues.Identity.Uneditable.TypeName": {
            "type": "string",
            "enum": [
                "AffiliationOrganization",
                "AffiliationRole",
                "AffiliationUnit",
                "BirthCity",
                "BirthCountry",
                "BirthDay",
                "BirthMonth",
                "BirthState",
                "BirthYear",
                "City",
                "Country",
                "GivenName",
                "HonorificPrefix",
                "HonorificSuffix",
                "HouseNumber",
                "MiddleName",
                "SchematizedXML",
                "State",
                "Street",
                "Surname",
                "ZipCode"
            ]
        },
        "RelationshipAttributeQueryJSON": {
            "type": "object",
            "properties": {
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "attributeCreationHints": {
                    "$ref": "#/definitions/RelationshipAttributeCreationHintsJSON"
                },
                "owner": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttributeQuery"
                }
            },
            "required": [
                "@type",
                "attributeCreationHints",
                "key",
                "owner"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeCreationHintsJSON": {
            "type": "object",
            "properties": {
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
                },
                "valueHints": {
                    "$ref": "#/definitions/ValueHintsJSON"
                },
                "description": {
                    "type": "string"
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Relationship.TypeName"
                },
                "title": {
                    "type": "string"
                }
            },
            "required": [
                "title",
                "valueType",
                "confidentiality"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Relationship.TypeName": {
            "type": "string",
            "enum": [
                "ProprietaryBoolean",
                "ProprietaryCountry",
                "ProprietaryEMailAddress",
                "ProprietaryFileReference",
                "ProprietaryFloat",
                "ProprietaryHEXColor",
                "ProprietaryInteger",
                "ProprietaryLanguage",
                "ProprietaryPhoneNumber",
                "ProprietaryString",
                "ProprietaryURL",
                "ProprietaryJSON",
                "ProprietaryXML",
                "Consent"
            ]
        },
        "IQLQueryJSON": {
            "type": "object",
            "properties": {
                "attributeCreationHints": {
                    "$ref": "#/definitions/IQLQueryCreationHintsJSON"
                },
                "queryString": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IQLQuery"
                }
            },
            "required": [
                "@type",
                "queryString"
            ],
            "additionalProperties": false
        },
        "IQLQueryCreationHintsJSON": {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                }
            },
            "required": [
                "valueType"
            ],
            "additionalProperties": false
        },
        "ReadAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "query": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/IQLQueryJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ReadAttributeRequestItem"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted",
                "query"
            ],
            "additionalProperties": false
        },
        "ThirdPartyRelationshipAttributeQueryJSON": {
            "type": "object",
            "properties": {
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "thirdParty": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "owner": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryOwner"
                        },
                        {
                            "type": "string",
                            "const": "thirdParty"
                        },
                        {
                            "type": "string",
                            "const": "recipient"
                        },
                        {
                            "type": "string",
                            "const": ""
                        }
                    ]
                },
                "key": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ThirdPartyRelationshipAttributeQuery"
                }
            },
            "required": [
                "@type",
                "key",
                "owner",
                "thirdParty"
            ],
            "additionalProperties": false
        },
        "ThirdPartyRelationshipAttributeQueryOwner": {
            "type": "string",
            "enum": [
                "thirdParty",
                "recipient",
                ""
            ]
        },
        "ConsentRequestItemJSON": {
            "type": "object",
            "properties": {
                "link": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ConsentRequestItem"
                }
            },
            "required": [
                "@type",
                "consent",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "AuthenticationRequestItemJSON": {
            "type": "object",
            "properties": {
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AuthenticationRequestItem"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "FreeTextRequestItemJSON": {
            "type": "object",
            "properties": {
                "freeText": {
                    "type": "string"
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "FreeTextRequestItem"
                }
            },
            "required": [
                "@type",
                "freeText",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "RegisterAttributeListenerRequestItemJSON": {
            "type": "object",
            "properties": {
                "query": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                        }
                    ]
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RegisterAttributeListenerRequestItem"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted",
                "query"
            ],
            "additionalProperties": false
        },
        "MessageIdString": {
            "type": "string",
            "pattern": "MSG[A-Za-z0-9]{17}"
        },
        "RelationshipTemplateIdString": {
            "type": "string",
            "pattern": "RLT[A-Za-z0-9]{17}"
        }
    }
}

export const RequireManualDecisionOfIncomingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/RequireManualDecisionOfIncomingRequestRequest",
    "definitions": {
        "RequireManualDecisionOfIncomingRequestRequest": {
            "type": "object",
            "properties": {
                "requestId": {
                    "$ref": "#/definitions/RequestIdString"
                }
            },
            "required": [
                "requestId"
            ],
            "additionalProperties": false
        },
        "RequestIdString": {
            "type": "string",
            "pattern": "REQ[A-Za-z0-9]{17}"
        }
    }
}

export const SentOutgoingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/SentOutgoingRequestRequest",
    "definitions": {
        "SentOutgoingRequestRequest": {
            "type": "object",
            "properties": {
                "messageId": {
                    "$ref": "#/definitions/MessageIdString"
                },
                "requestId": {
                    "$ref": "#/definitions/RequestIdString"
                }
            },
            "required": [
                "requestId",
                "messageId"
            ],
            "additionalProperties": false
        },
        "RequestIdString": {
            "type": "string",
            "pattern": "REQ[A-Za-z0-9]{17}"
        },
        "MessageIdString": {
            "type": "string",
            "pattern": "MSG[A-Za-z0-9]{17}"
        }
    }
}

export const CreateAndShareRelationshipAttributeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateAndShareRelationshipAttributeRequest",
    "definitions": {
        "CreateAndShareRelationshipAttributeRequest": {
            "type": "object",
            "properties": {
                "requestItemMetadata": {
                    "type": "object",
                    "properties": {
                        "requireManualDecision": {
                            "type": "boolean"
                        },
                        "metadata": {
                            "type": "object"
                        },
                        "description": {
                            "type": "string"
                        },
                        "title": {
                            "type": "string"
                        }
                    },
                    "additionalProperties": false
                },
                "requestMetadata": {
                    "type": "object",
                    "properties": {
                        "expiresAt": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "metadata": {
                            "type": "object"
                        },
                        "description": {
                            "type": "string"
                        },
                        "title": {
                            "type": "string"
                        }
                    },
                    "additionalProperties": false
                },
                "peer": {
                    "$ref": "#/definitions/AddressString"
                },
                "content": {
                    "type": "object",
                    "properties": {
                        "validTo": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "validFrom": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "isTechnical": {
                            "type": "boolean"
                        },
                        "confidentiality": {
                            "$ref": "#/definitions/RelationshipAttributeConfidentiality"
                        },
                        "key": {
                            "type": "string"
                        },
                        "value": {
                            "$ref": "#/definitions/AttributeValues.Relationship.Json"
                        }
                    },
                    "required": [
                        "value",
                        "key",
                        "confidentiality"
                    ],
                    "additionalProperties": false
                }
            },
            "required": [
                "content",
                "peer"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Relationship.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/ProprietaryBooleanJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryCountryJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryEMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFloatJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryHEXColorJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryIntegerJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryLanguageJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryPhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryStringJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryURLJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryJSONJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryXMLJSON"
                },
                {
                    "$ref": "#/definitions/ConsentJSON"
                }
            ]
        },
        "ProprietaryBooleanJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ValueHintsOverrideJSON": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "displayName": {
                    "type": "string"
                },
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                }
            },
            "required": [
                "key",
                "displayName"
            ],
            "additionalProperties": false
        },
        "ValueHintsJSON": {
            "type": "object",
            "properties": {
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "ProprietaryCountryJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryEMailAddressJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFileReferenceJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFloatJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryHEXColorJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryIntegerJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryLanguageJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryPhoneNumberJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryStringJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryURLJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryJSONJSON": {
            "type": "object",
            "properties": {
                "value": {},
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ConsentJSON": {
            "type": "object",
            "properties": {
                "link": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "consent"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeConfidentiality": {
            "type": "string",
            "enum": [
                "public",
                "private",
                "protected"
            ]
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const CreateRepositoryAttributeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateRepositoryAttributeRequest",
    "definitions": {
        "CreateRepositoryAttributeRequest": {
            "type": "object",
            "properties": {
                "content": {
                    "type": "object",
                    "properties": {
                        "validTo": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "validFrom": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "tags": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "value": {
                            "$ref": "#/definitions/AttributeValues.Identity.Json"
                        }
                    },
                    "required": [
                        "value"
                    ],
                    "additionalProperties": false
                }
            },
            "required": [
                "content"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.Json"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.Json"
                }
            ]
        },
        "AttributeValues.Identity.Editable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationJSON"
                },
                {
                    "$ref": "#/definitions/BirthDateJSON"
                },
                {
                    "$ref": "#/definitions/BirthNameJSON"
                },
                {
                    "$ref": "#/definitions/BirthPlaceJSON"
                },
                {
                    "$ref": "#/definitions/CitizenshipJSON"
                },
                {
                    "$ref": "#/definitions/CommunicationLanguageJSON"
                },
                {
                    "$ref": "#/definitions/DeliveryBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/DisplayNameJSON"
                },
                {
                    "$ref": "#/definitions/EMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/FaxNumberJSON"
                },
                {
                    "$ref": "#/definitions/IdentityFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/JobTitleJSON"
                },
                {
                    "$ref": "#/definitions/NationalityJSON"
                },
                {
                    "$ref": "#/definitions/PersonNameJSON"
                },
                {
                    "$ref": "#/definitions/PhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/PostOfficeBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/PseudonymJSON"
                },
                {
                    "$ref": "#/definitions/SexJSON"
                },
                {
                    "$ref": "#/definitions/StreetAddressJSON"
                },
                {
                    "$ref": "#/definitions/WebsiteJSON"
                }
            ]
        },
        "AffiliationJSON": {
            "type": "object",
            "properties": {
                "unit": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                }
            },
            "required": [
                "@type",
                "organization"
            ],
            "additionalProperties": false
        },
        "BirthDateJSON": {
            "type": "object",
            "properties": {
                "year": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "day": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                }
            },
            "required": [
                "@type",
                "day",
                "month",
                "year"
            ],
            "additionalProperties": false
        },
        "BirthNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                }
            },
            "required": [
                "@type",
                "city",
                "country"
            ],
            "additionalProperties": false
        },
        "CitizenshipJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "deliveryBoxId",
                "recipient",
                "userId",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "DisplayNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "honorificPrefix": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                }
            },
            "required": [
                "@type",
                "givenName",
                "surname"
            ],
            "additionalProperties": false
        },
        "PhoneNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                }
            },
            "required": [
                "@type",
                "boxId",
                "city",
                "country",
                "recipient",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "PseudonymJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SexJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Sex"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "houseNo",
                "recipient",
                "street",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "WebsiteJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Website"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Uneditable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationOrganizationJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationRoleJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationUnitJSON"
                },
                {
                    "$ref": "#/definitions/BirthCityJSON"
                },
                {
                    "$ref": "#/definitions/BirthCountryJSON"
                },
                {
                    "$ref": "#/definitions/BirthDayJSON"
                },
                {
                    "$ref": "#/definitions/BirthMonthJSON"
                },
                {
                    "$ref": "#/definitions/BirthStateJSON"
                },
                {
                    "$ref": "#/definitions/BirthYearJSON"
                },
                {
                    "$ref": "#/definitions/CityJSON"
                },
                {
                    "$ref": "#/definitions/CountryJSON"
                },
                {
                    "$ref": "#/definitions/GivenNameJSON"
                },
                {
                    "$ref": "#/definitions/HonorificPrefixJSON"
                },
                {
                    "$ref": "#/definitions/HonorificSuffixJSON"
                },
                {
                    "$ref": "#/definitions/HouseNumberJSON"
                },
                {
                    "$ref": "#/definitions/MiddleNameJSON"
                },
                {
                    "$ref": "#/definitions/SchematizedXMLJSON"
                },
                {
                    "$ref": "#/definitions/StateJSON"
                },
                {
                    "$ref": "#/definitions/StreetJSON"
                },
                {
                    "$ref": "#/definitions/SurnameJSON"
                },
                {
                    "$ref": "#/definitions/ZipCodeJSON"
                }
            ]
        },
        "AffiliationOrganizationJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthDayJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthMonthJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number",
                    "enum": [
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                        9,
                        10,
                        11,
                        12
                    ],
                    "description": "Month values: 1 (january) - 12 (december)"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthStateJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthState"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthYearJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "City"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CountryJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Country"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StateJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "State"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Street"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Surname"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        }
    }
}

export const DeleteOwnSharedAttributeAndNotifyPeerRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeleteOwnSharedAttributeAndNotifyPeerRequest",
    "definitions": {
        "DeleteOwnSharedAttributeAndNotifyPeerRequest": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "$ref": "#/definitions/AttributeIdString"
                }
            },
            "required": [
                "attributeId"
            ],
            "additionalProperties": false
        },
        "AttributeIdString": {
            "type": "string",
            "pattern": "ATT[A-Za-z0-9]{17}"
        }
    }
}

export const DeletePeerSharedAttributeAndNotifyOwnerRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeletePeerSharedAttributeAndNotifyOwnerRequest",
    "definitions": {
        "DeletePeerSharedAttributeAndNotifyOwnerRequest": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "$ref": "#/definitions/AttributeIdString"
                }
            },
            "required": [
                "attributeId"
            ],
            "additionalProperties": false
        },
        "AttributeIdString": {
            "type": "string",
            "pattern": "ATT[A-Za-z0-9]{17}"
        }
    }
}

export const DeleteRepositoryAttributeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeleteRepositoryAttributeRequest",
    "definitions": {
        "DeleteRepositoryAttributeRequest": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "$ref": "#/definitions/AttributeIdString"
                }
            },
            "required": [
                "attributeId"
            ],
            "additionalProperties": false
        },
        "AttributeIdString": {
            "type": "string",
            "pattern": "ATT[A-Za-z0-9]{17}"
        }
    }
}

export const DeleteSharedAttributesForRejectedOrRevokedRelationshipRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeleteSharedAttributesForRejectedOrRevokedRelationshipRequest",
    "definitions": {
        "DeleteSharedAttributesForRejectedOrRevokedRelationshipRequest": {
            "type": "object",
            "properties": {
                "relationshipId": {
                    "$ref": "#/definitions/RelationshipIdString"
                }
            },
            "required": [
                "relationshipId"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const DeleteThirdPartyRelationshipAttributeAndNotifyPeerRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeleteThirdPartyRelationshipAttributeAndNotifyPeerRequest",
    "definitions": {
        "DeleteThirdPartyRelationshipAttributeAndNotifyPeerRequest": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "$ref": "#/definitions/AttributeIdString"
                }
            },
            "required": [
                "attributeId"
            ],
            "additionalProperties": false
        },
        "AttributeIdString": {
            "type": "string",
            "pattern": "ATT[A-Za-z0-9]{17}"
        }
    }
}

export const ExecuteIdentityAttributeQueryRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ExecuteIdentityAttributeQueryRequest",
    "definitions": {
        "ExecuteIdentityAttributeQueryRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "$ref": "#/definitions/IdentityAttributeQueryJSON"
                }
            },
            "required": [
                "query"
            ],
            "additionalProperties": false
        },
        "IdentityAttributeQueryJSON": {
            "type": "object",
            "properties": {
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityAttributeQuery"
                }
            },
            "required": [
                "@type",
                "valueType"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.TypeName": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.TypeName"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.TypeName"
                }
            ]
        },
        "AttributeValues.Identity.Editable.TypeName": {
            "type": "string",
            "enum": [
                "Affiliation",
                "BirthDate",
                "BirthName",
                "BirthPlace",
                "Citizenship",
                "CommunicationLanguage",
                "DeliveryBoxAddress",
                "DisplayName",
                "EMailAddress",
                "FaxNumber",
                "IdentityFileReference",
                "SchematizedXML",
                "JobTitle",
                "Nationality",
                "PersonName",
                "PhoneNumber",
                "PostOfficeBoxAddress",
                "Pseudonym",
                "Sex",
                "StreetAddress",
                "Website"
            ]
        },
        "AttributeValues.Identity.Uneditable.TypeName": {
            "type": "string",
            "enum": [
                "AffiliationOrganization",
                "AffiliationRole",
                "AffiliationUnit",
                "BirthCity",
                "BirthCountry",
                "BirthDay",
                "BirthMonth",
                "BirthState",
                "BirthYear",
                "City",
                "Country",
                "GivenName",
                "HonorificPrefix",
                "HonorificSuffix",
                "HouseNumber",
                "MiddleName",
                "SchematizedXML",
                "State",
                "Street",
                "Surname",
                "ZipCode"
            ]
        }
    }
}

export const ExecuteIQLQueryRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ExecuteIQLQueryRequest",
    "definitions": {
        "ExecuteIQLQueryRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                        "@version": {
                            "type": "string"
                        },
                        "@context": {
                            "type": "string"
                        },
                        "attributeCreationHints": {
                            "$ref": "#/definitions/IQLQueryCreationHintsJSON"
                        },
                        "queryString": {
                            "type": "string"
                        },
                        "@type": {
                            "type": "string",
                            "const": "IQLQuery"
                        }
                    },
                    "required": [
                        "queryString"
                    ]
                }
            },
            "required": [
                "query"
            ],
            "additionalProperties": false
        },
        "IQLQueryCreationHintsJSON": {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                }
            },
            "required": [
                "valueType"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.TypeName": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.TypeName"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.TypeName"
                }
            ]
        },
        "AttributeValues.Identity.Editable.TypeName": {
            "type": "string",
            "enum": [
                "Affiliation",
                "BirthDate",
                "BirthName",
                "BirthPlace",
                "Citizenship",
                "CommunicationLanguage",
                "DeliveryBoxAddress",
                "DisplayName",
                "EMailAddress",
                "FaxNumber",
                "IdentityFileReference",
                "SchematizedXML",
                "JobTitle",
                "Nationality",
                "PersonName",
                "PhoneNumber",
                "PostOfficeBoxAddress",
                "Pseudonym",
                "Sex",
                "StreetAddress",
                "Website"
            ]
        },
        "AttributeValues.Identity.Uneditable.TypeName": {
            "type": "string",
            "enum": [
                "AffiliationOrganization",
                "AffiliationRole",
                "AffiliationUnit",
                "BirthCity",
                "BirthCountry",
                "BirthDay",
                "BirthMonth",
                "BirthState",
                "BirthYear",
                "City",
                "Country",
                "GivenName",
                "HonorificPrefix",
                "HonorificSuffix",
                "HouseNumber",
                "MiddleName",
                "SchematizedXML",
                "State",
                "Street",
                "Surname",
                "ZipCode"
            ]
        }
    }
}

export const ExecuteRelationshipAttributeQueryRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ExecuteRelationshipAttributeQueryRequest",
    "definitions": {
        "ExecuteRelationshipAttributeQueryRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "$ref": "#/definitions/RelationshipAttributeQueryJSON"
                }
            },
            "required": [
                "query"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeQueryJSON": {
            "type": "object",
            "properties": {
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "attributeCreationHints": {
                    "$ref": "#/definitions/RelationshipAttributeCreationHintsJSON"
                },
                "owner": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttributeQuery"
                }
            },
            "required": [
                "@type",
                "attributeCreationHints",
                "key",
                "owner"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeCreationHintsJSON": {
            "type": "object",
            "properties": {
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
                },
                "valueHints": {
                    "$ref": "#/definitions/ValueHintsJSON"
                },
                "description": {
                    "type": "string"
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Relationship.TypeName"
                },
                "title": {
                    "type": "string"
                }
            },
            "required": [
                "title",
                "valueType",
                "confidentiality"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Relationship.TypeName": {
            "type": "string",
            "enum": [
                "ProprietaryBoolean",
                "ProprietaryCountry",
                "ProprietaryEMailAddress",
                "ProprietaryFileReference",
                "ProprietaryFloat",
                "ProprietaryHEXColor",
                "ProprietaryInteger",
                "ProprietaryLanguage",
                "ProprietaryPhoneNumber",
                "ProprietaryString",
                "ProprietaryURL",
                "ProprietaryJSON",
                "ProprietaryXML",
                "Consent"
            ]
        },
        "ValueHintsJSON": {
            "type": "object",
            "properties": {
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "displayName": {
                    "type": "string"
                },
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                }
            },
            "required": [
                "key",
                "displayName"
            ],
            "additionalProperties": false
        },
        "RelationshipAttributeConfidentiality": {
            "type": "string",
            "enum": [
                "public",
                "private",
                "protected"
            ]
        }
    }
}

export const ExecuteThirdPartyRelationshipAttributeQueryRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ExecuteThirdPartyRelationshipAttributeQueryRequest",
    "definitions": {
        "ExecuteThirdPartyRelationshipAttributeQueryRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                }
            },
            "required": [
                "query"
            ],
            "additionalProperties": false
        },
        "ThirdPartyRelationshipAttributeQueryJSON": {
            "type": "object",
            "properties": {
                "validTo": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "thirdParty": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "owner": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryOwner"
                        },
                        {
                            "type": "string",
                            "const": "thirdParty"
                        },
                        {
                            "type": "string",
                            "const": "recipient"
                        },
                        {
                            "type": "string",
                            "const": ""
                        }
                    ]
                },
                "key": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ThirdPartyRelationshipAttributeQuery"
                }
            },
            "required": [
                "@type",
                "key",
                "owner",
                "thirdParty"
            ],
            "additionalProperties": false
        },
        "ThirdPartyRelationshipAttributeQueryOwner": {
            "type": "string",
            "enum": [
                "thirdParty",
                "recipient",
                ""
            ]
        }
    }
}

export const GetAttributeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetAttributeRequest",
    "definitions": {
        "GetAttributeRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/AttributeIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "AttributeIdString": {
            "type": "string",
            "pattern": "ATT[A-Za-z0-9]{17}"
        }
    }
}

export const GetAttributesRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetAttributesRequest",
    "definitions": {
        "GetAttributesRequest": {
            "type": "object",
            "properties": {
                "hideTechnical": {
                    "type": "boolean"
                },
                "onlyValid": {
                    "type": "boolean"
                },
                "query": {
                    "$ref": "#/definitions/GetAttributesRequestQuery"
                }
            },
            "additionalProperties": false
        },
        "GetAttributesRequestQuery": {
            "type": "object",
            "properties": {
                "deletionInfo.deletionDate": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "deletionInfo.deletionStatus": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "deletionInfo": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo.thirdPartyAddress": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo.sourceAttribute": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo.peer": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo.notificationReference": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo.requestReference": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.value.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.confidentiality": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.isTechnical": {
                    "type": "string"
                },
                "content.key": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.validTo": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.validFrom": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.owner": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.tags": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "isDefault": {
                    "type": "string"
                },
                "succeededBy": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "succeeds": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "parentId": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdAt": {
                    "type": "string"
                }
            },
            "additionalProperties": false
        }
    }
}

export const GetOwnSharedAttributesRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetOwnSharedAttributesRequest",
    "definitions": {
        "GetOwnSharedAttributesRequest": {
            "type": "object",
            "properties": {
                "onlyLatestVersions": {
                    "type": "boolean",
                    "description": "default: true"
                },
                "hideTechnical": {
                    "type": "boolean"
                },
                "query": {
                    "$ref": "#/definitions/GetOwnSharedAttributeRequestQuery"
                },
                "onlyValid": {
                    "type": "boolean"
                },
                "peer": {
                    "$ref": "#/definitions/AddressString"
                }
            },
            "required": [
                "peer"
            ],
            "additionalProperties": false
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        },
        "GetOwnSharedAttributeRequestQuery": {
            "type": "object",
            "properties": {
                "deletionInfo.deletionDate": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "deletionInfo.deletionStatus": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "deletionInfo": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo.thirdPartyAddress": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo.sourceAttribute": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo.notificationReference": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo.requestReference": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.value.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.confidentiality": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.isTechnical": {
                    "type": "string"
                },
                "content.key": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.validTo": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.validFrom": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.tags": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdAt": {
                    "type": "string"
                }
            },
            "additionalProperties": false
        }
    }
}

export const GetPeerSharedAttributesRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetPeerSharedAttributesRequest",
    "definitions": {
        "GetPeerSharedAttributesRequest": {
            "type": "object",
            "properties": {
                "onlyLatestVersions": {
                    "type": "boolean",
                    "description": "default: true"
                },
                "hideTechnical": {
                    "type": "boolean"
                },
                "query": {
                    "$ref": "#/definitions/GetPeerSharedAttributesRequestQuery"
                },
                "onlyValid": {
                    "type": "boolean"
                },
                "peer": {
                    "$ref": "#/definitions/AddressString"
                }
            },
            "required": [
                "peer"
            ],
            "additionalProperties": false
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        },
        "GetPeerSharedAttributesRequestQuery": {
            "type": "object",
            "properties": {
                "deletionInfo.deletionDate": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "deletionInfo.deletionStatus": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "deletionInfo": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo.thirdPartyAddress": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo.notificationReference": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo.requestReference": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "shareInfo": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.value.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.confidentiality": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.isTechnical": {
                    "type": "string"
                },
                "content.key": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.validTo": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.validFrom": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.tags": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdAt": {
                    "type": "string"
                }
            },
            "additionalProperties": false
        }
    }
}

export const GetRepositoryAttributesRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetRepositoryAttributesRequest",
    "definitions": {
        "GetRepositoryAttributesRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "$ref": "#/definitions/GetRepositoryAttributesRequestQuery"
                },
                "onlyLatestVersions": {
                    "type": "boolean",
                    "description": "default: true"
                }
            },
            "additionalProperties": false
        },
        "GetRepositoryAttributesRequestQuery": {
            "type": "object",
            "properties": {
                "content.value.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.validTo": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.validFrom": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.tags": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "isDefault": {
                    "type": "string"
                },
                "createdAt": {
                    "type": "string"
                }
            },
            "additionalProperties": false
        }
    }
}

export const GetSharedVersionsOfAttributeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetSharedVersionsOfAttributeRequest",
    "definitions": {
        "GetSharedVersionsOfAttributeRequest": {
            "type": "object",
            "properties": {
                "onlyLatestVersions": {
                    "type": "boolean",
                    "description": "default: true"
                },
                "peers": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/AddressString"
                    }
                },
                "attributeId": {
                    "$ref": "#/definitions/AttributeIdString"
                }
            },
            "required": [
                "attributeId"
            ],
            "additionalProperties": false
        },
        "AttributeIdString": {
            "type": "string",
            "pattern": "ATT[A-Za-z0-9]{17}"
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const GetVersionsOfAttributeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetVersionsOfAttributeRequest",
    "definitions": {
        "GetVersionsOfAttributeRequest": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "$ref": "#/definitions/AttributeIdString"
                }
            },
            "required": [
                "attributeId"
            ],
            "additionalProperties": false
        },
        "AttributeIdString": {
            "type": "string",
            "pattern": "ATT[A-Za-z0-9]{17}"
        }
    }
}

export const NotifyPeerAboutRepositoryAttributeSuccessionRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/NotifyPeerAboutRepositoryAttributeSuccessionRequest",
    "definitions": {
        "NotifyPeerAboutRepositoryAttributeSuccessionRequest": {
            "type": "object",
            "properties": {
                "peer": {
                    "$ref": "#/definitions/AddressString"
                },
                "attributeId": {
                    "$ref": "#/definitions/AttributeIdString"
                }
            },
            "required": [
                "attributeId",
                "peer"
            ],
            "additionalProperties": false
        },
        "AttributeIdString": {
            "type": "string",
            "pattern": "ATT[A-Za-z0-9]{17}"
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const ShareRepositoryAttributeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ShareRepositoryAttributeRequest",
    "definitions": {
        "ShareRepositoryAttributeRequest": {
            "type": "object",
            "properties": {
                "requestItemMetadata": {
                    "type": "object",
                    "properties": {
                        "requireManualDecision": {
                            "type": "boolean"
                        },
                        "metadata": {
                            "type": "object"
                        },
                        "description": {
                            "type": "string"
                        },
                        "title": {
                            "type": "string"
                        }
                    },
                    "additionalProperties": false
                },
                "requestMetadata": {
                    "type": "object",
                    "properties": {
                        "expiresAt": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "metadata": {
                            "type": "object"
                        },
                        "description": {
                            "type": "string"
                        },
                        "title": {
                            "type": "string"
                        }
                    },
                    "additionalProperties": false
                },
                "peer": {
                    "$ref": "#/definitions/AddressString"
                },
                "attributeId": {
                    "$ref": "#/definitions/AttributeIdString"
                }
            },
            "required": [
                "attributeId",
                "peer"
            ],
            "additionalProperties": false
        },
        "AttributeIdString": {
            "type": "string",
            "pattern": "ATT[A-Za-z0-9]{17}"
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        }
    }
}

export const SucceedRelationshipAttributeAndNotifyPeerRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/SucceedRelationshipAttributeAndNotifyPeerRequest",
    "definitions": {
        "SucceedRelationshipAttributeAndNotifyPeerRequest": {
            "type": "object",
            "properties": {
                "successorContent": {
                    "type": "object",
                    "properties": {
                        "validTo": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "validFrom": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "value": {
                            "$ref": "#/definitions/AttributeValues.Relationship.Json"
                        }
                    },
                    "required": [
                        "value"
                    ],
                    "additionalProperties": false
                },
                "predecessorId": {
                    "$ref": "#/definitions/AttributeIdString"
                }
            },
            "required": [
                "predecessorId",
                "successorContent"
            ],
            "additionalProperties": false
        },
        "AttributeIdString": {
            "type": "string",
            "pattern": "ATT[A-Za-z0-9]{17}"
        },
        "AttributeValues.Relationship.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/ProprietaryBooleanJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryCountryJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryEMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryFloatJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryHEXColorJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryIntegerJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryLanguageJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryPhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryStringJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryURLJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryJSONJSON"
                },
                {
                    "$ref": "#/definitions/ProprietaryXMLJSON"
                },
                {
                    "$ref": "#/definitions/ConsentJSON"
                }
            ]
        },
        "ProprietaryBooleanJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ValueHintsOverrideJSON": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "displayName": {
                    "type": "string"
                },
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                }
            },
            "required": [
                "key",
                "displayName"
            ],
            "additionalProperties": false
        },
        "ValueHintsJSON": {
            "type": "object",
            "properties": {
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "pattern": {
                    "type": "string"
                },
                "max": {
                    "type": "number"
                },
                "min": {
                    "type": "number"
                },
                "editHelp": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "ProprietaryCountryJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryEMailAddressJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFileReferenceJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryFloatJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryHEXColorJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryIntegerJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryLanguageJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryPhoneNumberJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryStringJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryURLJSON": {
            "type": "object",
            "properties": {
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryJSONJSON": {
            "type": "object",
            "properties": {
                "value": {},
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ProprietaryXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                }
            },
            "required": [
                "@type",
                "title",
                "value"
            ],
            "additionalProperties": false
        },
        "ConsentJSON": {
            "type": "object",
            "properties": {
                "link": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "consent"
            ],
            "additionalProperties": false
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        }
    }
}

export const SucceedRepositoryAttributeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/SucceedRepositoryAttributeRequest",
    "definitions": {
        "SucceedRepositoryAttributeRequest": {
            "type": "object",
            "properties": {
                "successorContent": {
                    "type": "object",
                    "properties": {
                        "validTo": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "validFrom": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "tags": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "value": {
                            "$ref": "#/definitions/AttributeValues.Identity.Json"
                        }
                    },
                    "required": [
                        "value"
                    ],
                    "additionalProperties": false
                },
                "predecessorId": {
                    "type": "string"
                }
            },
            "required": [
                "predecessorId",
                "successorContent"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.Json"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.Json"
                }
            ]
        },
        "AttributeValues.Identity.Editable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationJSON"
                },
                {
                    "$ref": "#/definitions/BirthDateJSON"
                },
                {
                    "$ref": "#/definitions/BirthNameJSON"
                },
                {
                    "$ref": "#/definitions/BirthPlaceJSON"
                },
                {
                    "$ref": "#/definitions/CitizenshipJSON"
                },
                {
                    "$ref": "#/definitions/CommunicationLanguageJSON"
                },
                {
                    "$ref": "#/definitions/DeliveryBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/DisplayNameJSON"
                },
                {
                    "$ref": "#/definitions/EMailAddressJSON"
                },
                {
                    "$ref": "#/definitions/FaxNumberJSON"
                },
                {
                    "$ref": "#/definitions/IdentityFileReferenceJSON"
                },
                {
                    "$ref": "#/definitions/JobTitleJSON"
                },
                {
                    "$ref": "#/definitions/NationalityJSON"
                },
                {
                    "$ref": "#/definitions/PersonNameJSON"
                },
                {
                    "$ref": "#/definitions/PhoneNumberJSON"
                },
                {
                    "$ref": "#/definitions/PostOfficeBoxAddressJSON"
                },
                {
                    "$ref": "#/definitions/PseudonymJSON"
                },
                {
                    "$ref": "#/definitions/SexJSON"
                },
                {
                    "$ref": "#/definitions/StreetAddressJSON"
                },
                {
                    "$ref": "#/definitions/WebsiteJSON"
                }
            ]
        },
        "AffiliationJSON": {
            "type": "object",
            "properties": {
                "unit": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                }
            },
            "required": [
                "@type",
                "organization"
            ],
            "additionalProperties": false
        },
        "BirthDateJSON": {
            "type": "object",
            "properties": {
                "year": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "day": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                }
            },
            "required": [
                "@type",
                "day",
                "month",
                "year"
            ],
            "additionalProperties": false
        },
        "BirthNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                }
            },
            "required": [
                "@type",
                "city",
                "country"
            ],
            "additionalProperties": false
        },
        "CitizenshipJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "deliveryBoxId",
                "recipient",
                "userId",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "DisplayNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "honorificPrefix": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                }
            },
            "required": [
                "@type",
                "givenName",
                "surname"
            ],
            "additionalProperties": false
        },
        "PhoneNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                }
            },
            "required": [
                "@type",
                "boxId",
                "city",
                "country",
                "recipient",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "PseudonymJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SexJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Sex"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "state": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                }
            },
            "required": [
                "@type",
                "city",
                "country",
                "houseNo",
                "recipient",
                "street",
                "zipCode"
            ],
            "additionalProperties": false
        },
        "WebsiteJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Website"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.Uneditable.Json": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AffiliationOrganizationJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationRoleJSON"
                },
                {
                    "$ref": "#/definitions/AffiliationUnitJSON"
                },
                {
                    "$ref": "#/definitions/BirthCityJSON"
                },
                {
                    "$ref": "#/definitions/BirthCountryJSON"
                },
                {
                    "$ref": "#/definitions/BirthDayJSON"
                },
                {
                    "$ref": "#/definitions/BirthMonthJSON"
                },
                {
                    "$ref": "#/definitions/BirthStateJSON"
                },
                {
                    "$ref": "#/definitions/BirthYearJSON"
                },
                {
                    "$ref": "#/definitions/CityJSON"
                },
                {
                    "$ref": "#/definitions/CountryJSON"
                },
                {
                    "$ref": "#/definitions/GivenNameJSON"
                },
                {
                    "$ref": "#/definitions/HonorificPrefixJSON"
                },
                {
                    "$ref": "#/definitions/HonorificSuffixJSON"
                },
                {
                    "$ref": "#/definitions/HouseNumberJSON"
                },
                {
                    "$ref": "#/definitions/MiddleNameJSON"
                },
                {
                    "$ref": "#/definitions/SchematizedXMLJSON"
                },
                {
                    "$ref": "#/definitions/StateJSON"
                },
                {
                    "$ref": "#/definitions/StreetJSON"
                },
                {
                    "$ref": "#/definitions/SurnameJSON"
                },
                {
                    "$ref": "#/definitions/ZipCodeJSON"
                }
            ]
        },
        "AffiliationOrganizationJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthCountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthDayJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthMonthJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number",
                    "enum": [
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                        9,
                        10,
                        11,
                        12
                    ],
                    "description": "Month values: 1 (january) - 12 (december)"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthStateJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthState"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "BirthYearJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "number"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "City"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "CountryJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Country"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "schemaURL": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StateJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "State"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "StreetJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Street"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "Surname"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        }
    }
}

export const ValidateIQLQueryRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ValidateIQLQueryRequest",
    "definitions": {
        "ValidateIQLQueryRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "$ref": "#/definitions/IQLQueryJSON"
                }
            },
            "required": [
                "query"
            ],
            "additionalProperties": false
        },
        "IQLQueryJSON": {
            "type": "object",
            "properties": {
                "attributeCreationHints": {
                    "$ref": "#/definitions/IQLQueryCreationHintsJSON"
                },
                "queryString": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "IQLQuery"
                }
            },
            "required": [
                "@type",
                "queryString"
            ],
            "additionalProperties": false
        },
        "IQLQueryCreationHintsJSON": {
            "type": "object",
            "properties": {
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                }
            },
            "required": [
                "valueType"
            ],
            "additionalProperties": false
        },
        "AttributeValues.Identity.TypeName": {
            "anyOf": [
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Editable.TypeName"
                },
                {
                    "$ref": "#/definitions/AttributeValues.Identity.Uneditable.TypeName"
                }
            ]
        },
        "AttributeValues.Identity.Editable.TypeName": {
            "type": "string",
            "enum": [
                "Affiliation",
                "BirthDate",
                "BirthName",
                "BirthPlace",
                "Citizenship",
                "CommunicationLanguage",
                "DeliveryBoxAddress",
                "DisplayName",
                "EMailAddress",
                "FaxNumber",
                "IdentityFileReference",
                "SchematizedXML",
                "JobTitle",
                "Nationality",
                "PersonName",
                "PhoneNumber",
                "PostOfficeBoxAddress",
                "Pseudonym",
                "Sex",
                "StreetAddress",
                "Website"
            ]
        },
        "AttributeValues.Identity.Uneditable.TypeName": {
            "type": "string",
            "enum": [
                "AffiliationOrganization",
                "AffiliationRole",
                "AffiliationUnit",
                "BirthCity",
                "BirthCountry",
                "BirthDay",
                "BirthMonth",
                "BirthState",
                "BirthYear",
                "City",
                "Country",
                "GivenName",
                "HonorificPrefix",
                "HonorificSuffix",
                "HouseNumber",
                "MiddleName",
                "SchematizedXML",
                "State",
                "Street",
                "Surname",
                "ZipCode"
            ]
        }
    }
}

export const CreateDraftRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateDraftRequest",
    "definitions": {
        "CreateDraftRequest": {
            "type": "object",
            "properties": {
                "type": {
                    "type": "string"
                },
                "content": {}
            },
            "required": [
                "content"
            ],
            "additionalProperties": false
        }
    }
}

export const DeleteDraftRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeleteDraftRequest",
    "definitions": {
        "DeleteDraftRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/LocalDraftIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "LocalDraftIdString": {
            "type": "string",
            "pattern": "LCLDRF[A-Za-z0-9]{14}"
        }
    }
}

export const GetDraftRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetDraftRequest",
    "definitions": {
        "GetDraftRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/LocalDraftIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "LocalDraftIdString": {
            "type": "string",
            "pattern": "LCLDRF[A-Za-z0-9]{14}"
        }
    }
}

export const GetDraftsRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetDraftsRequest",
    "definitions": {
        "GetDraftsRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "$ref": "#/definitions/GetDraftsQuery"
                }
            },
            "additionalProperties": false
        },
        "GetDraftsQuery": {
            "type": "object",
            "properties": {
                "lastModifiedAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                }
            },
            "additionalProperties": false
        }
    }
}

export const UpdateDraftRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/UpdateDraftRequest",
    "definitions": {
        "UpdateDraftRequest": {
            "type": "object",
            "properties": {
                "content": {},
                "id": {
                    "$ref": "#/definitions/LocalDraftIdString"
                }
            },
            "required": [
                "id",
                "content"
            ],
            "additionalProperties": false
        },
        "LocalDraftIdString": {
            "type": "string",
            "pattern": "LCLDRF[A-Za-z0-9]{14}"
        }
    }
}

export const DeleteIdentityMetadataRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeleteIdentityMetadataRequest",
    "definitions": {
        "DeleteIdentityMetadataRequest": {
            "type": "object",
            "properties": {
                "key": {
                    "type": "string"
                },
                "reference": {
                    "$ref": "#/definitions/AddressString"
                }
            },
            "required": [
                "reference"
            ],
            "additionalProperties": false
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const GetIdentityMetadataRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetIdentityMetadataRequest",
    "definitions": {
        "GetIdentityMetadataRequest": {
            "type": "object",
            "properties": {
                "key": {
                    "type": "string"
                },
                "reference": {
                    "$ref": "#/definitions/AddressString"
                }
            },
            "required": [
                "reference"
            ],
            "additionalProperties": false
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const UpsertIdentityMetadataRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/UpsertIdentityMetadataRequest",
    "definitions": {
        "UpsertIdentityMetadataRequest": {
            "type": "object",
            "properties": {
                "value": {},
                "key": {
                    "type": "string"
                },
                "reference": {
                    "$ref": "#/definitions/AddressString"
                }
            },
            "required": [
                "reference",
                "value"
            ],
            "additionalProperties": false
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const GetNotificationRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetNotificationRequest",
    "definitions": {
        "GetNotificationRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/NotificationIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "NotificationIdString": {
            "type": "string",
            "pattern": "NOT[A-Za-z0-9]{17}"
        }
    }
}

export const GetNotificationsRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetNotificationsRequest",
    "definitions": {
        "GetNotificationsRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "$ref": "#/definitions/GetNotificationsRequestQuery"
                }
            },
            "additionalProperties": false
        },
        "GetNotificationsRequestQuery": {
            "type": "object",
            "additionalProperties": {
                "anyOf": [
                    {
                        "type": "string"
                    },
                    {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    }
                ]
            }
        }
    }
}

export const ProcessNotificationByIdRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ProcessNotificationByIdRequest",
    "definitions": {
        "ProcessNotificationByIdRequest": {
            "type": "object",
            "properties": {
                "notificationId": {
                    "$ref": "#/definitions/NotificationIdString"
                }
            },
            "required": [
                "notificationId"
            ],
            "additionalProperties": false
        },
        "NotificationIdString": {
            "type": "string",
            "pattern": "NOT[A-Za-z0-9]{17}"
        }
    }
}

export const ReceivedNotificationRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ReceivedNotificationRequest",
    "definitions": {
        "ReceivedNotificationRequest": {
            "type": "object",
            "properties": {
                "messageId": {
                    "$ref": "#/definitions/MessageIdString"
                }
            },
            "required": [
                "messageId"
            ],
            "additionalProperties": false
        },
        "MessageIdString": {
            "type": "string",
            "pattern": "MSG[A-Za-z0-9]{17}"
        }
    }
}

export const SentNotificationRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/SentNotificationRequest",
    "definitions": {
        "SentNotificationRequest": {
            "type": "object",
            "properties": {
                "messageId": {
                    "$ref": "#/definitions/MessageIdString"
                }
            },
            "required": [
                "messageId"
            ],
            "additionalProperties": false
        },
        "MessageIdString": {
            "type": "string",
            "pattern": "MSG[A-Za-z0-9]{17}"
        }
    }
}

export const CreateSettingRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateSettingRequest",
    "definitions": {
        "CreateSettingRequest": {
            "type": "object",
            "properties": {
                "succeedsItem": {
                    "$ref": "#/definitions/LocalSettingIdString"
                },
                "succeedsAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "scope": {
                    "type": "string",
                    "enum": [
                        "Identity",
                        "Device",
                        "Relationship"
                    ]
                },
                "reference": {
                    "$ref": "#/definitions/GenericIdString"
                },
                "value": {},
                "key": {
                    "type": "string"
                }
            },
            "required": [
                "key",
                "value"
            ],
            "additionalProperties": false
        },
        "GenericIdString": {
            "type": "string",
            "pattern": "[A-Za-z0-9]{20}"
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        },
        "LocalSettingIdString": {
            "type": "string",
            "pattern": "LCLSET[A-Za-z0-9]{14}"
        }
    }
}

export const DeleteSettingRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeleteSettingRequest",
    "definitions": {
        "DeleteSettingRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/LocalSettingIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "LocalSettingIdString": {
            "type": "string",
            "pattern": "LCLSET[A-Za-z0-9]{14}"
        }
    }
}

export const GetSettingRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetSettingRequest",
    "definitions": {
        "GetSettingRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/LocalSettingIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "LocalSettingIdString": {
            "type": "string",
            "pattern": "LCLSET[A-Za-z0-9]{14}"
        }
    }
}

export const GetSettingByKeyRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetSettingByKeyRequest",
    "definitions": {
        "GetSettingByKeyRequest": {
            "type": "object",
            "properties": {
                "scope": {
                    "type": "string",
                    "enum": [
                        "Identity",
                        "Device",
                        "Relationship"
                    ]
                },
                "reference": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                }
            },
            "required": [
                "key"
            ],
            "additionalProperties": false
        }
    }
}

export const GetSettingsRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetSettingsRequest",
    "definitions": {
        "GetSettingsRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "$ref": "#/definitions/GetSettingsQuery"
                }
            },
            "additionalProperties": false
        },
        "GetSettingsQuery": {
            "type": "object",
            "properties": {
                "succeedsAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "succeedsItem": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "reference": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "scope": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "key": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                }
            },
            "additionalProperties": false
        }
    }
}

export const UpdateSettingRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/UpdateSettingRequest",
    "definitions": {
        "UpdateSettingRequest": {
            "type": "object",
            "properties": {
                "value": {},
                "id": {
                    "$ref": "#/definitions/LocalSettingIdString"
                }
            },
            "required": [
                "id",
                "value"
            ],
            "additionalProperties": false
        },
        "LocalSettingIdString": {
            "type": "string",
            "pattern": "LCLSET[A-Za-z0-9]{14}"
        }
    }
}

export const UpsertSettingByKeyRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/UpsertSettingByKeyRequest",
    "definitions": {
        "UpsertSettingByKeyRequest": {
            "type": "object",
            "properties": {
                "scope": {
                    "type": "string",
                    "enum": [
                        "Identity",
                        "Device",
                        "Relationship"
                    ]
                },
                "reference": {
                    "$ref": "#/definitions/GenericIdString"
                },
                "value": {},
                "key": {
                    "type": "string"
                }
            },
            "required": [
                "key",
                "value"
            ],
            "additionalProperties": false
        },
        "GenericIdString": {
            "type": "string",
            "pattern": "[A-Za-z0-9]{20}"
        }
    }
}

export const DownloadFileRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DownloadFileRequest",
    "definitions": {
        "DownloadFileRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/FileIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "FileIdString": {
            "type": "string",
            "pattern": "FIL[A-Za-z0-9]{17}"
        }
    }
}

export const LoadItemFromTruncatedReferenceRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/LoadItemFromTruncatedReferenceRequest",
    "definitions": {
        "LoadItemFromTruncatedReferenceRequest": {
            "type": "object",
            "properties": {
                "password": {
                    "type": "string"
                },
                "reference": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/TokenReferenceString"
                        },
                        {
                            "$ref": "#/definitions/FileReferenceString"
                        },
                        {
                            "$ref": "#/definitions/RelationshipTemplateReferenceString"
                        }
                    ]
                }
            },
            "required": [
                "reference"
            ],
            "additionalProperties": false
        },
        "TokenReferenceString": {
            "type": "string",
            "pattern": "VE9L.{84}"
        },
        "FileReferenceString": {
            "type": "string",
            "pattern": "RklM.{84}"
        },
        "RelationshipTemplateReferenceString": {
            "type": "string",
            "pattern": "UkxU.{84}"
        }
    }
}

export const RegisterPushNotificationTokenRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/RegisterPushNotificationTokenRequest",
    "definitions": {
        "RegisterPushNotificationTokenRequest": {
            "type": "object",
            "properties": {
                "environment": {
                    "type": "string",
                    "enum": [
                        "Development",
                        "Production"
                    ]
                },
                "appId": {
                    "type": "string"
                },
                "platform": {
                    "type": "string"
                },
                "handle": {
                    "type": "string"
                }
            },
            "required": [
                "handle",
                "platform",
                "appId"
            ],
            "additionalProperties": false
        }
    }
}

export const GetIdentityDeletionProcessRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetIdentityDeletionProcessRequest",
    "definitions": {
        "GetIdentityDeletionProcessRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/IdentityDeletionProcessIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "IdentityDeletionProcessIdString": {
            "type": "string",
            "pattern": "IDP[A-Za-z0-9]{17}"
        }
    }
}

export const DownloadAttachmentRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DownloadAttachmentRequest",
    "definitions": {
        "DownloadAttachmentRequest": {
            "type": "object",
            "properties": {
                "attachmentId": {
                    "$ref": "#/definitions/FileIdString"
                },
                "id": {
                    "$ref": "#/definitions/MessageIdString"
                }
            },
            "required": [
                "id",
                "attachmentId"
            ],
            "additionalProperties": false
        },
        "MessageIdString": {
            "type": "string",
            "pattern": "MSG[A-Za-z0-9]{17}"
        },
        "FileIdString": {
            "type": "string",
            "pattern": "FIL[A-Za-z0-9]{17}"
        }
    }
}

export const CreateRelationshipChallengeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateRelationshipChallengeRequest",
    "definitions": {
        "CreateRelationshipChallengeRequest": {
            "type": "object",
            "properties": {
                "relationship": {
                    "$ref": "#/definitions/RelationshipIdString"
                },
                "challengeType": {
                    "type": "string",
                    "const": "Relationship"
                }
            },
            "required": [
                "challengeType",
                "relationship"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const isCreateRelationshipChallengeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/isCreateRelationshipChallengeRequest",
    "definitions": {
        "isCreateRelationshipChallengeRequest": {
            "$comment": "(value: any) => value is CreateRelationshipChallengeRequest",
            "type": "object",
            "properties": {
                "namedArgs": {
                    "type": "object",
                    "properties": {
                        "value": {}
                    },
                    "required": [
                        "value"
                    ],
                    "additionalProperties": false
                }
            }
        }
    }
}

export const CreateIdentityChallengeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateIdentityChallengeRequest",
    "definitions": {
        "CreateIdentityChallengeRequest": {
            "type": "object",
            "properties": {
                "challengeType": {
                    "type": "string",
                    "const": "Identity"
                }
            },
            "required": [
                "challengeType"
            ],
            "additionalProperties": false
        }
    }
}

export const isCreateIdentityChallengeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/isCreateIdentityChallengeRequest",
    "definitions": {
        "isCreateIdentityChallengeRequest": {
            "$comment": "(value: any) => value is CreateIdentityChallengeRequest",
            "type": "object",
            "properties": {
                "namedArgs": {
                    "type": "object",
                    "properties": {
                        "value": {}
                    },
                    "required": [
                        "value"
                    ],
                    "additionalProperties": false
                }
            }
        }
    }
}

export const CreateDeviceChallengeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateDeviceChallengeRequest",
    "definitions": {
        "CreateDeviceChallengeRequest": {
            "type": "object",
            "properties": {
                "challengeType": {
                    "type": "string",
                    "const": "Device"
                }
            },
            "required": [
                "challengeType"
            ],
            "additionalProperties": false
        }
    }
}

export const isCreateDeviceChallengeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/isCreateDeviceChallengeRequest",
    "definitions": {
        "isCreateDeviceChallengeRequest": {
            "$comment": "(value: any) => value is CreateDeviceChallengeRequest",
            "type": "object",
            "properties": {
                "namedArgs": {
                    "type": "object",
                    "properties": {
                        "value": {}
                    },
                    "required": [
                        "value"
                    ],
                    "additionalProperties": false
                }
            }
        }
    }
}

export const CreateChallengeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateChallengeRequest",
    "definitions": {
        "CreateChallengeRequest": {
            "anyOf": [
                {
                    "$ref": "#/definitions/CreateRelationshipChallengeRequest"
                },
                {
                    "$ref": "#/definitions/CreateIdentityChallengeRequest"
                },
                {
                    "$ref": "#/definitions/CreateDeviceChallengeRequest"
                }
            ]
        },
        "CreateRelationshipChallengeRequest": {
            "type": "object",
            "properties": {
                "relationship": {
                    "$ref": "#/definitions/RelationshipIdString"
                },
                "challengeType": {
                    "type": "string",
                    "const": "Relationship"
                }
            },
            "required": [
                "challengeType",
                "relationship"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        },
        "CreateIdentityChallengeRequest": {
            "type": "object",
            "properties": {
                "challengeType": {
                    "type": "string",
                    "const": "Identity"
                }
            },
            "required": [
                "challengeType"
            ],
            "additionalProperties": false
        },
        "CreateDeviceChallengeRequest": {
            "type": "object",
            "properties": {
                "challengeType": {
                    "type": "string",
                    "const": "Device"
                }
            },
            "required": [
                "challengeType"
            ],
            "additionalProperties": false
        }
    }
}

export const ValidateChallengeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ValidateChallengeRequest",
    "definitions": {
        "ValidateChallengeRequest": {
            "type": "object",
            "properties": {
                "signature": {
                    "type": "string"
                },
                "challengeString": {
                    "type": "string"
                }
            },
            "required": [
                "challengeString",
                "signature"
            ],
            "additionalProperties": false
        }
    }
}

export const CreateDeviceRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateDeviceRequest",
    "definitions": {
        "CreateDeviceRequest": {
            "type": "object",
            "properties": {
                "isAdmin": {
                    "type": "boolean"
                },
                "description": {
                    "type": "string"
                },
                "name": {
                    "type": "string"
                }
            },
            "additionalProperties": false
        }
    }
}

export const CreateDeviceOnboardingTokenRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateDeviceOnboardingTokenRequest",
    "definitions": {
        "CreateDeviceOnboardingTokenRequest": {
            "type": "object",
            "properties": {
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "password": {
                            "type": "string"
                        }
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
                },
                "profileName": {
                    "type": "string"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "id": {
                    "$ref": "#/definitions/DeviceIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "DeviceIdString": {
            "type": "string",
            "pattern": "DVC[A-Za-z0-9]{17}"
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        }
    }
}

export const DeleteDeviceRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeleteDeviceRequest",
    "definitions": {
        "DeleteDeviceRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/DeviceIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "DeviceIdString": {
            "type": "string",
            "pattern": "DVC[A-Za-z0-9]{17}"
        }
    }
}

export const GetDeviceRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetDeviceRequest",
    "definitions": {
        "GetDeviceRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/DeviceIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "DeviceIdString": {
            "type": "string",
            "pattern": "DVC[A-Za-z0-9]{17}"
        }
    }
}

export const GetDeviceOnboardingInfoRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetDeviceOnboardingInfoRequest",
    "definitions": {
        "GetDeviceOnboardingInfoRequest": {
            "type": "object",
            "properties": {
                "profileName": {
                    "type": "string"
                },
                "id": {
                    "$ref": "#/definitions/GenericIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "GenericIdString": {
            "type": "string",
            "pattern": "[A-Za-z0-9]{20}"
        }
    }
}

export const SetCommunicationLanguageRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/SetCommunicationLanguageRequest",
    "definitions": {
        "SetCommunicationLanguageRequest": {
            "type": "object",
            "properties": {
                "communicationLanguage": {
                    "$ref": "#/definitions/LanguageISO639"
                }
            },
            "required": [
                "communicationLanguage"
            ],
            "additionalProperties": false
        },
        "LanguageISO639": {
            "type": "string",
            "enum": [
                "aa",
                "ab",
                "ae",
                "af",
                "ak",
                "am",
                "an",
                "ar",
                "as",
                "av",
                "ay",
                "az",
                "ba",
                "be",
                "bg",
                "bi",
                "bm",
                "bn",
                "bo",
                "br",
                "bs",
                "ca",
                "ce",
                "ch",
                "co",
                "cr",
                "cs",
                "cu",
                "cv",
                "cy",
                "da",
                "de",
                "dv",
                "dz",
                "ee",
                "el",
                "en",
                "eo",
                "es",
                "et",
                "eu",
                "fa",
                "ff",
                "fi",
                "fj",
                "fo",
                "fr",
                "fy",
                "ga",
                "gd",
                "gl",
                "gn",
                "gu",
                "gv",
                "ha",
                "he",
                "hi",
                "ho",
                "hr",
                "ht",
                "hu",
                "hy",
                "hz",
                "ia",
                "id",
                "ie",
                "ig",
                "ii",
                "ik",
                "io",
                "is",
                "it",
                "iu",
                "ja",
                "jv",
                "ka",
                "kg",
                "ki",
                "kj",
                "kk",
                "kl",
                "km",
                "kn",
                "ko",
                "kr",
                "ks",
                "ku",
                "kv",
                "kw",
                "ky",
                "la",
                "lb",
                "lg",
                "li",
                "ln",
                "lo",
                "lt",
                "lu",
                "lv",
                "mg",
                "mh",
                "mi",
                "mk",
                "ml",
                "mn",
                "mr",
                "ms",
                "mt",
                "my",
                "na",
                "nb",
                "nd",
                "ne",
                "ng",
                "nl",
                "nn",
                "no",
                "nr",
                "nv",
                "ny",
                "oc",
                "oj",
                "om",
                "or",
                "os",
                "pa",
                "pi",
                "pl",
                "ps",
                "pt",
                "qu",
                "rm",
                "rn",
                "ro",
                "ru",
                "rw",
                "sa",
                "sc",
                "sd",
                "se",
                "sg",
                "si",
                "sk",
                "sl",
                "sm",
                "sn",
                "so",
                "sq",
                "sr",
                "ss",
                "st",
                "su",
                "sv",
                "sw",
                "ta",
                "te",
                "tg",
                "th",
                "ti",
                "tk",
                "tl",
                "tn",
                "to",
                "tr",
                "ts",
                "tt",
                "tw",
                "ty",
                "ug",
                "uk",
                "ur",
                "uz",
                "ve",
                "vi",
                "vo",
                "wa",
                "wo",
                "xh",
                "yi",
                "yo",
                "za",
                "zh",
                "zu"
            ]
        }
    }
}

export const UpdateDeviceRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/UpdateDeviceRequest",
    "definitions": {
        "UpdateDeviceRequest": {
            "type": "object",
            "properties": {
                "description": {
                    "type": "string"
                },
                "name": {
                    "type": "string"
                },
                "id": {
                    "$ref": "#/definitions/DeviceIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "DeviceIdString": {
            "type": "string",
            "pattern": "DVC[A-Za-z0-9]{17}"
        }
    }
}

export const CreateQRCodeForFileRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateQRCodeForFileRequest",
    "definitions": {
        "CreateQRCodeForFileRequest": {
            "type": "object",
            "properties": {
                "fileId": {
                    "$ref": "#/definitions/FileIdString"
                }
            },
            "required": [
                "fileId"
            ],
            "additionalProperties": false
        },
        "FileIdString": {
            "type": "string",
            "pattern": "FIL[A-Za-z0-9]{17}"
        }
    }
}

export const CreateTokenForFileRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateTokenForFileRequest",
    "definitions": {
        "CreateTokenForFileRequest": {
            "type": "object",
            "properties": {
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "password": {
                            "type": "string",
                            "minLength": 1
                        }
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
                },
                "forIdentity": {
                    "$ref": "#/definitions/AddressString"
                },
                "ephemeral": {
                    "type": "boolean"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "fileId": {
                    "$ref": "#/definitions/FileIdString"
                }
            },
            "required": [
                "fileId"
            ],
            "additionalProperties": false
        },
        "FileIdString": {
            "type": "string",
            "pattern": "FIL[A-Za-z0-9]{17}"
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const CreateTokenQRCodeForFileRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateTokenQRCodeForFileRequest",
    "definitions": {
        "CreateTokenQRCodeForFileRequest": {
            "type": "object",
            "properties": {
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "password": {
                            "type": "string",
                            "minLength": 1
                        }
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
                },
                "forIdentity": {
                    "$ref": "#/definitions/AddressString"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "fileId": {
                    "$ref": "#/definitions/FileIdString"
                }
            },
            "required": [
                "fileId"
            ],
            "additionalProperties": false
        },
        "FileIdString": {
            "type": "string",
            "pattern": "FIL[A-Za-z0-9]{17}"
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const GetFileRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetFileRequest",
    "definitions": {
        "GetFileRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/FileIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "FileIdString": {
            "type": "string",
            "pattern": "FIL[A-Za-z0-9]{17}"
        }
    }
}

export const GetFilesRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetFilesRequest",
    "definitions": {
        "GetFilesRequest": {
            "type": "object",
            "properties": {
                "ownerRestriction": {
                    "$ref": "#/definitions/OwnerRestriction"
                },
                "query": {
                    "$ref": "#/definitions/GetFilesQuery"
                }
            },
            "additionalProperties": false
        },
        "GetFilesQuery": {
            "type": "object",
            "properties": {
                "isOwn": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "title": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "mimetype": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "filesize": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "filename": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "expiresAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "description": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdByDevice": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdBy": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                }
            },
            "additionalProperties": false
        },
        "OwnerRestriction": {
            "type": "string",
            "enum": [
                "o",
                "p"
            ]
        }
    }
}

export const GetOrLoadFileRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetOrLoadFileRequest",
    "definitions": {
        "GetOrLoadFileRequest": {
            "type": "object",
            "properties": {
                "password": {
                    "type": "string"
                },
                "reference": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/TokenReferenceString"
                        },
                        {
                            "$ref": "#/definitions/FileReferenceString"
                        }
                    ]
                }
            },
            "required": [
                "reference"
            ],
            "additionalProperties": false,
            "errorMessage": "token / file reference invalid"
        },
        "TokenReferenceString": {
            "type": "string",
            "pattern": "VE9L.{84}"
        },
        "FileReferenceString": {
            "type": "string",
            "pattern": "RklM.{84}"
        }
    }
}

export const UploadOwnFileRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/UploadOwnFileRequest",
    "definitions": {
        "UploadOwnFileRequest": {
            "type": "object",
            "properties": {
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "mimetype": {
                    "type": "string"
                },
                "filename": {
                    "type": "string"
                },
                "content": {
                    "type": "object",
                    "properties": {
                        "length": {
                            "type": "number"
                        },
                        "byteOffset": {
                            "type": "number"
                        },
                        "byteLength": {
                            "type": "number"
                        },
                        "buffer": {
                            "type": "object",
                            "properties": {
                                "byteLength": {
                                    "type": "number"
                                }
                            },
                            "required": [
                                "byteLength"
                            ],
                            "additionalProperties": false
                        },
                        "BYTES_PER_ELEMENT": {
                            "type": "number"
                        }
                    },
                    "required": [
                        "BYTES_PER_ELEMENT",
                        "buffer",
                        "byteLength",
                        "byteOffset",
                        "length"
                    ],
                    "additionalProperties": {
                        "type": "number"
                    }
                }
            },
            "required": [
                "content",
                "filename",
                "mimetype"
            ],
            "additionalProperties": false
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        }
    }
}

export const UploadOwnFileValidatableRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/UploadOwnFileValidatableRequest",
    "definitions": {
        "UploadOwnFileValidatableRequest": {
            "type": "object",
            "properties": {
                "content": {
                    "type": "object"
                },
                "description": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "mimetype": {
                    "type": "string"
                },
                "filename": {
                    "type": "string"
                }
            },
            "required": [
                "content",
                "filename",
                "mimetype"
            ],
            "additionalProperties": false
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        }
    }
}

export const CreateIdentityRecoveryKitRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateIdentityRecoveryKitRequest",
    "definitions": {
        "CreateIdentityRecoveryKitRequest": {
            "type": "object",
            "properties": {
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "password": {
                            "type": "string",
                            "minLength": 1
                        }
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
                },
                "profileName": {
                    "type": "string"
                }
            },
            "required": [
                "profileName",
                "passwordProtection"
            ],
            "additionalProperties": false
        }
    }
}

export const GetAttachmentMetadataRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetAttachmentMetadataRequest",
    "definitions": {
        "GetAttachmentMetadataRequest": {
            "type": "object",
            "properties": {
                "attachmentId": {
                    "$ref": "#/definitions/FileIdString"
                },
                "id": {
                    "$ref": "#/definitions/MessageIdString"
                }
            },
            "required": [
                "id",
                "attachmentId"
            ],
            "additionalProperties": false
        },
        "MessageIdString": {
            "type": "string",
            "pattern": "MSG[A-Za-z0-9]{17}"
        },
        "FileIdString": {
            "type": "string",
            "pattern": "FIL[A-Za-z0-9]{17}"
        }
    }
}

export const GetMessageRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetMessageRequest",
    "definitions": {
        "GetMessageRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/MessageIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "MessageIdString": {
            "type": "string",
            "pattern": "MSG[A-Za-z0-9]{17}"
        }
    }
}

export const GetMessagesRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetMessagesRequest",
    "definitions": {
        "GetMessagesRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "$ref": "#/definitions/GetMessagesQuery"
                }
            },
            "additionalProperties": false
        },
        "GetMessagesQuery": {
            "type": "object",
            "properties": {
                "participant": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "wasReadAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "recipients.relationshipId": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "recipients.address": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "attachments": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.subject": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.body": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "content.@type": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdByDevice": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdBy": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                }
            },
            "additionalProperties": false
        }
    }
}

export const MarkMessageAsReadRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/MarkMessageAsReadRequest",
    "definitions": {
        "MarkMessageAsReadRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/MessageIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "MessageIdString": {
            "type": "string",
            "pattern": "MSG[A-Za-z0-9]{17}"
        }
    }
}

export const MarkMessageAsUnreadRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/MarkMessageAsUnreadRequest",
    "definitions": {
        "MarkMessageAsUnreadRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/MessageIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "MessageIdString": {
            "type": "string",
            "pattern": "MSG[A-Za-z0-9]{17}"
        }
    }
}

export const SendMessageRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/SendMessageRequest",
    "definitions": {
        "SendMessageRequest": {
            "type": "object",
            "properties": {
                "attachments": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/FileIdString"
                    }
                },
                "content": {},
                "recipients": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/AddressString"
                    },
                    "minItems": 1
                }
            },
            "required": [
                "recipients",
                "content"
            ],
            "additionalProperties": false
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        },
        "FileIdString": {
            "type": "string",
            "pattern": "FIL[A-Za-z0-9]{17}"
        }
    }
}

export const AcceptRelationshipRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/AcceptRelationshipRequest",
    "definitions": {
        "AcceptRelationshipRequest": {
            "type": "object",
            "properties": {
                "relationshipId": {
                    "$ref": "#/definitions/RelationshipIdString"
                }
            },
            "required": [
                "relationshipId"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const AcceptRelationshipReactivationRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/AcceptRelationshipReactivationRequest",
    "definitions": {
        "AcceptRelationshipReactivationRequest": {
            "type": "object",
            "properties": {
                "relationshipId": {
                    "$ref": "#/definitions/RelationshipIdString"
                }
            },
            "required": [
                "relationshipId"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const CanCreateRelationshipRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CanCreateRelationshipRequest",
    "definitions": {
        "CanCreateRelationshipRequest": {
            "type": "object",
            "properties": {
                "creationContent": {},
                "templateId": {
                    "$ref": "#/definitions/RelationshipTemplateIdString"
                }
            },
            "required": [
                "templateId"
            ],
            "additionalProperties": false
        },
        "RelationshipTemplateIdString": {
            "type": "string",
            "pattern": "RLT[A-Za-z0-9]{17}"
        }
    }
}

export const CreateRelationshipRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateRelationshipRequest",
    "definitions": {
        "CreateRelationshipRequest": {
            "type": "object",
            "properties": {
                "creationContent": {},
                "templateId": {
                    "$ref": "#/definitions/RelationshipTemplateIdString"
                }
            },
            "required": [
                "templateId",
                "creationContent"
            ],
            "additionalProperties": false
        },
        "RelationshipTemplateIdString": {
            "type": "string",
            "pattern": "RLT[A-Za-z0-9]{17}"
        }
    }
}

export const DecomposeRelationshipRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DecomposeRelationshipRequest",
    "definitions": {
        "DecomposeRelationshipRequest": {
            "type": "object",
            "properties": {
                "relationshipId": {
                    "$ref": "#/definitions/RelationshipIdString"
                }
            },
            "required": [
                "relationshipId"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const GetAttributesForRelationshipRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetAttributesForRelationshipRequest",
    "definitions": {
        "GetAttributesForRelationshipRequest": {
            "type": "object",
            "properties": {
                "onlyLatestVersions": {
                    "type": "boolean",
                    "description": "default: true"
                },
                "hideTechnical": {
                    "type": "boolean"
                },
                "id": {
                    "$ref": "#/definitions/RelationshipIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const GetRelationshipRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetRelationshipRequest",
    "definitions": {
        "GetRelationshipRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/RelationshipIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const GetRelationshipByAddressRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetRelationshipByAddressRequest",
    "definitions": {
        "GetRelationshipByAddressRequest": {
            "type": "object",
            "properties": {
                "address": {
                    "$ref": "#/definitions/AddressString"
                }
            },
            "required": [
                "address"
            ],
            "additionalProperties": false
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const GetRelationshipsRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetRelationshipsRequest",
    "definitions": {
        "GetRelationshipsRequest": {
            "type": "object",
            "properties": {
                "query": {
                    "$ref": "#/definitions/GetRelationshipsQuery"
                }
            },
            "additionalProperties": false
        },
        "GetRelationshipsQuery": {
            "type": "object",
            "properties": {
                "template.id": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "status": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "peer": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                }
            },
            "additionalProperties": false
        }
    }
}

export const RejectRelationshipRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/RejectRelationshipRequest",
    "definitions": {
        "RejectRelationshipRequest": {
            "type": "object",
            "properties": {
                "relationshipId": {
                    "$ref": "#/definitions/RelationshipIdString"
                }
            },
            "required": [
                "relationshipId"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const RejectRelationshipReactivationRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/RejectRelationshipReactivationRequest",
    "definitions": {
        "RejectRelationshipReactivationRequest": {
            "type": "object",
            "properties": {
                "relationshipId": {
                    "$ref": "#/definitions/RelationshipIdString"
                }
            },
            "required": [
                "relationshipId"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const RequestRelationshipReactivationRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/RequestRelationshipReactivationRequest",
    "definitions": {
        "RequestRelationshipReactivationRequest": {
            "type": "object",
            "properties": {
                "relationshipId": {
                    "$ref": "#/definitions/RelationshipIdString"
                }
            },
            "required": [
                "relationshipId"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const RevokeRelationshipRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/RevokeRelationshipRequest",
    "definitions": {
        "RevokeRelationshipRequest": {
            "type": "object",
            "properties": {
                "relationshipId": {
                    "$ref": "#/definitions/RelationshipIdString"
                }
            },
            "required": [
                "relationshipId"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const RevokeRelationshipReactivationRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/RevokeRelationshipReactivationRequest",
    "definitions": {
        "RevokeRelationshipReactivationRequest": {
            "type": "object",
            "properties": {
                "relationshipId": {
                    "$ref": "#/definitions/RelationshipIdString"
                }
            },
            "required": [
                "relationshipId"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const TerminateRelationshipRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/TerminateRelationshipRequest",
    "definitions": {
        "TerminateRelationshipRequest": {
            "type": "object",
            "properties": {
                "relationshipId": {
                    "$ref": "#/definitions/RelationshipIdString"
                }
            },
            "required": [
                "relationshipId"
            ],
            "additionalProperties": false
        },
        "RelationshipIdString": {
            "type": "string",
            "pattern": "REL[A-Za-z0-9]{17}"
        }
    }
}

export const CreateOwnRelationshipTemplateRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateOwnRelationshipTemplateRequest",
    "definitions": {
        "CreateOwnRelationshipTemplateRequest": {
            "type": "object",
            "properties": {
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "password": {
                            "type": "string",
                            "minLength": 1
                        }
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
                },
                "forIdentity": {
                    "$ref": "#/definitions/AddressString"
                },
                "maxNumberOfAllocations": {
                    "type": "number",
                    "minimum": 1
                },
                "content": {},
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                }
            },
            "required": [
                "expiresAt",
                "content"
            ],
            "additionalProperties": false
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const CreateQRCodeForOwnTemplateRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateQRCodeForOwnTemplateRequest",
    "definitions": {
        "CreateQRCodeForOwnTemplateRequest": {
            "type": "object",
            "properties": {
                "templateId": {
                    "$ref": "#/definitions/RelationshipTemplateIdString"
                }
            },
            "required": [
                "templateId"
            ],
            "additionalProperties": false
        },
        "RelationshipTemplateIdString": {
            "type": "string",
            "pattern": "RLT[A-Za-z0-9]{17}"
        }
    }
}

export const CreateTokenForOwnTemplateRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateTokenForOwnTemplateRequest",
    "definitions": {
        "CreateTokenForOwnTemplateRequest": {
            "type": "object",
            "properties": {
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "password": {
                            "type": "string",
                            "minLength": 1
                        }
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
                },
                "forIdentity": {
                    "$ref": "#/definitions/AddressString"
                },
                "ephemeral": {
                    "type": "boolean"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "templateId": {
                    "$ref": "#/definitions/RelationshipTemplateIdString"
                }
            },
            "required": [
                "templateId"
            ],
            "additionalProperties": false
        },
        "RelationshipTemplateIdString": {
            "type": "string",
            "pattern": "RLT[A-Za-z0-9]{17}"
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const CreateTokenQRCodeForOwnTemplateRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateTokenQRCodeForOwnTemplateRequest",
    "definitions": {
        "CreateTokenQRCodeForOwnTemplateRequest": {
            "type": "object",
            "properties": {
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "password": {
                            "type": "string",
                            "minLength": 1
                        }
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
                },
                "forIdentity": {
                    "$ref": "#/definitions/AddressString"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "templateId": {
                    "$ref": "#/definitions/RelationshipTemplateIdString"
                }
            },
            "required": [
                "templateId"
            ],
            "additionalProperties": false
        },
        "RelationshipTemplateIdString": {
            "type": "string",
            "pattern": "RLT[A-Za-z0-9]{17}"
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const GetRelationshipTemplateRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetRelationshipTemplateRequest",
    "definitions": {
        "GetRelationshipTemplateRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/RelationshipTemplateIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "RelationshipTemplateIdString": {
            "type": "string",
            "pattern": "RLT[A-Za-z0-9]{17}"
        }
    }
}

export const GetRelationshipTemplatesRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetRelationshipTemplatesRequest",
    "definitions": {
        "GetRelationshipTemplatesRequest": {
            "type": "object",
            "properties": {
                "ownerRestriction": {
                    "$ref": "#/definitions/OwnerRestriction"
                },
                "query": {
                    "$ref": "#/definitions/GetRelationshipTemplatesQuery"
                }
            },
            "additionalProperties": false
        },
        "GetRelationshipTemplatesQuery": {
            "type": "object",
            "properties": {
                "passwordProtection.passwordIsPin": {
                    "type": "string",
                    "enum": [
                        "true",
                        "!"
                    ]
                },
                "passwordProtection.password": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "passwordProtection": {
                    "type": "string",
                    "enum": [
                        "",
                        "!"
                    ]
                },
                "forIdentity": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "maxNumberOfAllocations": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdByDevice": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdBy": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "expiresAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "isOwn": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                }
            },
            "additionalProperties": false
        },
        "OwnerRestriction": {
            "type": "string",
            "enum": [
                "o",
                "p"
            ]
        }
    }
}

export const LoadPeerRelationshipTemplateRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/LoadPeerRelationshipTemplateRequest",
    "definitions": {
        "LoadPeerRelationshipTemplateRequest": {
            "type": "object",
            "properties": {
                "password": {
                    "type": "string"
                },
                "reference": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/TokenReferenceString"
                        },
                        {
                            "$ref": "#/definitions/RelationshipTemplateReferenceString"
                        }
                    ]
                }
            },
            "required": [
                "reference"
            ],
            "additionalProperties": false,
            "errorMessage": "token / relationship template reference invalid"
        },
        "TokenReferenceString": {
            "type": "string",
            "pattern": "VE9L.{84}"
        },
        "RelationshipTemplateReferenceString": {
            "type": "string",
            "pattern": "UkxU.{84}"
        }
    }
}

export const CreateOwnTokenRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateOwnTokenRequest",
    "definitions": {
        "CreateOwnTokenRequest": {
            "type": "object",
            "properties": {
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "password": {
                            "type": "string",
                            "minLength": 1
                        }
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
                },
                "forIdentity": {
                    "$ref": "#/definitions/AddressString"
                },
                "ephemeral": {
                    "type": "boolean"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "content": {}
            },
            "required": [
                "content",
                "expiresAt",
                "ephemeral"
            ],
            "additionalProperties": false
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const GetQRCodeForTokenRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetQRCodeForTokenRequest",
    "definitions": {
        "GetQRCodeForTokenRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/TokenIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "TokenIdString": {
            "type": "string",
            "pattern": "TOK[A-Za-z0-9]{17}"
        }
    }
}

export const GetTokenRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetTokenRequest",
    "definitions": {
        "GetTokenRequest": {
            "type": "object",
            "properties": {
                "id": {
                    "$ref": "#/definitions/TokenIdString"
                }
            },
            "required": [
                "id"
            ],
            "additionalProperties": false
        },
        "TokenIdString": {
            "type": "string",
            "pattern": "TOK[A-Za-z0-9]{17}"
        }
    }
}

export const GetTokensRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetTokensRequest",
    "definitions": {
        "GetTokensRequest": {
            "type": "object",
            "properties": {
                "ownerRestriction": {
                    "$ref": "#/definitions/OwnerRestriction"
                },
                "query": {
                    "$ref": "#/definitions/GetTokensQuery"
                }
            },
            "additionalProperties": false
        },
        "GetTokensQuery": {
            "type": "object",
            "properties": {
                "passwordProtection.passwordIsPin": {
                    "type": "string",
                    "enum": [
                        "true",
                        "!"
                    ]
                },
                "passwordProtection.password": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "passwordProtection": {
                    "type": "string",
                    "enum": [
                        "",
                        "!"
                    ]
                },
                "forIdentity": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "expiresAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdByDevice": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdBy": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "createdAt": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        }
                    ]
                }
            },
            "additionalProperties": false
        },
        "OwnerRestriction": {
            "type": "string",
            "enum": [
                "o",
                "p"
            ]
        }
    }
}

export const LoadPeerTokenRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/LoadPeerTokenRequest",
    "definitions": {
        "LoadPeerTokenRequest": {
            "type": "object",
            "properties": {
                "password": {
                    "type": "string"
                },
                "ephemeral": {
                    "type": "boolean"
                },
                "reference": {
                    "$ref": "#/definitions/TokenReferenceString"
                }
            },
            "required": [
                "reference",
                "ephemeral"
            ],
            "additionalProperties": false,
            "errorMessage": "token reference invalid"
        },
        "TokenReferenceString": {
            "type": "string",
            "pattern": "VE9L.{84}"
        }
    }
}