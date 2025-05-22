export const LoadPeerTokenAnonymousRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/LoadPeerTokenAnonymousRequest",
    "definitions": {
        "LoadPeerTokenAnonymousRequest": {
            "type": "object",
            "properties": {
                "reference": {
                    "$ref": "#/definitions/TokenReferenceString"
                },
                "password": {
                    "type": "string"
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

export const CanCreateRepositoryAttributeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CanCreateRepositoryAttributeRequest",
    "definitions": {
        "CanCreateRepositoryAttributeRequest": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
                "content": {
                    "type": "object",
                    "properties": {
                        "value": {},
                        "tags": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "validFrom": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "validTo": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
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
            ]
        },
        "ISO8601DateTimeString": {
            "type": "string",
            "errorMessage": "must match ISO8601 datetime format",
            "pattern": "^([+-]?\\d{4}(?!\\d{2}\\b))((-?)((0[1-9]|1[0-2])(\\3([12]\\d|0[1-9]|3[01]))?|W([0-4]\\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\\d|[12]\\d{2}|3([0-5]\\d|6[1-6])))([T\\s]((([01]\\d|2[0-3])((:?)[0-5]\\d)?|24:?00)([.,]\\d+(?!:))?)?(\\17[0-5]\\d([.,]\\d+)?)?([zZ]|([+-])([01]\\d|2[0-3]):?([0-5]\\d)?)?)?)?$"
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
                "requestId": {
                    "type": "string"
                },
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
                "accept": {
                    "type": "boolean",
                    "const": false
                },
                "code": {
                    "type": "string"
                },
                "message": {
                    "type": "string"
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
                "content": {
                    "type": "object",
                    "properties": {
                        "expiresAt": {
                            "type": "string",
                            "description": "The point in time the request is considered obsolete either technically (e.g. the request is no longer valid or its response is no longer accepted) or from a business perspective (e.g. the request is no longer of interest).",
                            "default": "undefined - the request won't expire"
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
                        "title": {
                            "type": "string",
                            "description": "The human-readable title of this Request."
                        },
                        "description": {
                            "type": "string",
                            "description": "The human-readable description of this Request."
                        },
                        "metadata": {
                            "type": "object",
                            "description": "This property can be used to add some arbitrary metadata to this request. The content of this property will be copied into the response on the side of the recipient."
                        },
                        "@context": {
                            "type": "string"
                        }
                    },
                    "required": [
                        "items"
                    ],
                    "additionalProperties": false
                },
                "peer": {
                    "$ref": "#/definitions/AddressString"
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
                "@type": {
                    "type": "string",
                    "const": "RequestItemGroup"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this group."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this group."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this group. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the group content as they receive the response."
                },
                "items": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/RequestItemJSONDerivations"
                    },
                    "description": "The items of this group."
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
                    "$ref": "#/definitions/FormFieldRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/RegisterAttributeListenerRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/TransferFileOwnershipRequestItemJSON"
                }
            ]
        },
        "RequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                "@type": {
                    "type": "string",
                    "const": "CreateAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        }
                    ]
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
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttribute"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Relationship.Json"
                },
                "key": {
                    "type": "string"
                },
                "isTechnical": {
                    "type": "boolean"
                },
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "displayName": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "value": {}
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Consent"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "link": {
                    "type": "string"
                },
                "linkDisplayText": {
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
                "@type": {
                    "type": "string",
                    "const": "IdentityAttribute"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Identity.Json"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "day": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "year": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "honorificPrefix": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SexJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Sex"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Website"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
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
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
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
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
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
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthState"
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
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "City"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "CountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Country"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "State"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "StreetJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Street"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Surname"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "DeleteAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DeleteAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "attributeId": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ShareAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                "sourceAttributeId": {
                    "type": "string"
                },
                "thirdPartyAddress": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ProposeAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
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
                "@type": {
                    "type": "string",
                    "const": "IdentityAttributeQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttributeQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "attributeCreationHints": {
                    "$ref": "#/definitions/RelationshipAttributeCreationHintsJSON"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
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
                "title": {
                    "type": "string"
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Relationship.TypeName"
                },
                "description": {
                    "type": "string"
                },
                "valueHints": {
                    "$ref": "#/definitions/ValueHintsJSON"
                },
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
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
                "@type": {
                    "type": "string",
                    "const": "IQLQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "queryString": {
                    "type": "string"
                },
                "attributeCreationHints": {
                    "$ref": "#/definitions/IQLQueryCreationHintsJSON"
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
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "ReadAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/IQLQueryJSON"
                        }
                    ]
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
                "@type": {
                    "type": "string",
                    "const": "ThirdPartyRelationshipAttributeQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "owner": {
                    "type": "string",
                    "enum": [
                        "thirdParty",
                        "recipient",
                        ""
                    ]
                },
                "thirdParty": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
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
        "ConsentRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "ConsentRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "consent": {
                    "type": "string"
                },
                "link": {
                    "type": "string"
                },
                "linkDisplayText": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "AuthenticationRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                "@type": {
                    "type": "string",
                    "const": "FreeTextRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "freeText": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "freeText",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "FormFieldRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "FormFieldRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "settings": {
                    "$ref": "#/definitions/FormFieldSettingsJSONDerivations"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted",
                "settings",
                "title"
            ],
            "additionalProperties": false
        },
        "FormFieldSettingsJSONDerivations": {
            "anyOf": [
                {
                    "$ref": "#/definitions/StringFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/IntegerFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/DoubleFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/BooleanFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/DateFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/SelectionFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/RatingFormFieldSettingsJSON"
                }
            ]
        },
        "StringFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "StringFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "allowNewlines": {
                    "type": "boolean",
                    "const": true
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "IntegerFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "IntegerFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "DoubleFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DoubleFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "BooleanFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BooleanFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "DateFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DateFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "SelectionFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "SelectionFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "options": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "allowMultipleSelection": {
                    "type": "boolean",
                    "const": true
                }
            },
            "required": [
                "@type",
                "options"
            ],
            "additionalProperties": false
        },
        "RatingFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "RatingFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "maxRating": {
                    "type": "number",
                    "enum": [
                        5,
                        6,
                        7,
                        8,
                        9,
                        10
                    ]
                }
            },
            "required": [
                "@type",
                "maxRating"
            ],
            "additionalProperties": false
        },
        "RegisterAttributeListenerRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "RegisterAttributeListenerRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "query": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                        }
                    ]
                }
            },
            "required": [
                "@type",
                "mustBeAccepted",
                "query"
            ],
            "additionalProperties": false
        },
        "TransferFileOwnershipRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "TransferFileOwnershipRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "fileReference": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "fileReference",
                "mustBeAccepted"
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
                "requestId": {
                    "type": "string"
                },
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
                "accept": {
                    "type": "boolean",
                    "const": false
                },
                "code": {
                    "type": "string"
                },
                "message": {
                    "type": "string"
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
                "requestId": {
                    "$ref": "#/definitions/RequestIdString"
                },
                "responseSourceId": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/MessageIdString"
                        },
                        {
                            "$ref": "#/definitions/RelationshipIdString"
                        }
                    ]
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
                "receivedResponse": {
                    "$ref": "#/definitions/ResponseJSON"
                },
                "messageId": {
                    "$ref": "#/definitions/MessageIdString"
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
                "@type": {
                    "type": "string",
                    "const": "Response"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "$ref": "#/definitions/ResponseResult"
                },
                "requestId": {
                    "type": "string"
                },
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
                "@type": {
                    "type": "string",
                    "const": "ResponseItemGroup"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "items": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ResponseItemJSONDerivations"
                    }
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
                },
                {
                    "$ref": "#/definitions/FormFieldAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/TransferFileOwnershipAcceptResponseItemJSON"
                }
            ]
        },
        "AcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
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
                "@type": {
                    "type": "string",
                    "const": "AttributeAlreadySharedAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "attributeId": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "AttributeSuccessionAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "predecessorId": {
                    "type": "string"
                },
                "successorId": {
                    "type": "string"
                },
                "successorContent": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
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
                "@type": {
                    "type": "string",
                    "const": "IdentityAttribute"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Identity.Json"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "day": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "year": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "honorificPrefix": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SexJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Sex"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Website"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
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
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
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
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
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
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthState"
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
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "City"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "CountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Country"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "State"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "StreetJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Street"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Surname"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "RelationshipAttributeJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttribute"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Relationship.Json"
                },
                "key": {
                    "type": "string"
                },
                "isTechnical": {
                    "type": "boolean"
                },
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "displayName": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "value": {}
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Consent"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "link": {
                    "type": "string"
                },
                "linkDisplayText": {
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
                "@type": {
                    "type": "string",
                    "const": "CreateAttributeAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "attributeId": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ShareAttributeAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "attributeId": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ProposeAttributeAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "attributeId": {
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
                "@type": {
                    "type": "string",
                    "const": "ReadAttributeAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "attributeId": {
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
                "thirdPartyAddress": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "RegisterAttributeListenerAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "listenerId": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "FreeTextAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "freeText": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "freeText",
                "result"
            ],
            "additionalProperties": false
        },
        "FormFieldAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "FormFieldAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "response": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "number"
                        },
                        {
                            "type": "boolean"
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
            "required": [
                "@type",
                "response",
                "result"
            ],
            "additionalProperties": false
        },
        "TransferFileOwnershipAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "TransferFileOwnershipAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "attributeId": {
                    "type": "string"
                },
                "attribute": {
                    "$ref": "#/definitions/IdentityAttributeJSON"
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
        "RejectResponseItemJSONDerivations": {
            "$ref": "#/definitions/RejectResponseItemJSON"
        },
        "RejectResponseItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "RejectResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Rejected"
                },
                "code": {
                    "type": "string"
                },
                "message": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ErrorResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Error"
                },
                "code": {
                    "type": "string"
                },
                "message": {
                    "type": "string"
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
                "templateId": {
                    "$ref": "#/definitions/RelationshipTemplateIdString"
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
                "response": {
                    "$ref": "#/definitions/ResponseJSON"
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
                "@type": {
                    "type": "string",
                    "const": "Response"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "$ref": "#/definitions/ResponseResult"
                },
                "requestId": {
                    "type": "string"
                },
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
                "@type": {
                    "type": "string",
                    "const": "ResponseItemGroup"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "items": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ResponseItemJSONDerivations"
                    }
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
                },
                {
                    "$ref": "#/definitions/FormFieldAcceptResponseItemJSON"
                },
                {
                    "$ref": "#/definitions/TransferFileOwnershipAcceptResponseItemJSON"
                }
            ]
        },
        "AcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
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
                "@type": {
                    "type": "string",
                    "const": "AttributeAlreadySharedAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "attributeId": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "AttributeSuccessionAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "predecessorId": {
                    "type": "string"
                },
                "successorId": {
                    "type": "string"
                },
                "successorContent": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
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
                "@type": {
                    "type": "string",
                    "const": "IdentityAttribute"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Identity.Json"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "day": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "year": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "honorificPrefix": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SexJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Sex"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Website"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
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
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
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
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
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
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthState"
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
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "City"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "CountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Country"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "State"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "StreetJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Street"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Surname"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "RelationshipAttributeJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttribute"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Relationship.Json"
                },
                "key": {
                    "type": "string"
                },
                "isTechnical": {
                    "type": "boolean"
                },
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "displayName": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "value": {}
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Consent"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "link": {
                    "type": "string"
                },
                "linkDisplayText": {
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
                "@type": {
                    "type": "string",
                    "const": "CreateAttributeAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "attributeId": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ShareAttributeAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "attributeId": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ProposeAttributeAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "attributeId": {
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
                "@type": {
                    "type": "string",
                    "const": "ReadAttributeAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "attributeId": {
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
                "thirdPartyAddress": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "RegisterAttributeListenerAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "listenerId": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "FreeTextAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "freeText": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "freeText",
                "result"
            ],
            "additionalProperties": false
        },
        "FormFieldAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "FormFieldAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "response": {
                    "anyOf": [
                        {
                            "type": "string"
                        },
                        {
                            "type": "number"
                        },
                        {
                            "type": "boolean"
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
            "required": [
                "@type",
                "response",
                "result"
            ],
            "additionalProperties": false
        },
        "TransferFileOwnershipAcceptResponseItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "TransferFileOwnershipAcceptResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Accepted"
                },
                "attributeId": {
                    "type": "string"
                },
                "attribute": {
                    "$ref": "#/definitions/IdentityAttributeJSON"
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
        "RejectResponseItemJSONDerivations": {
            "$ref": "#/definitions/RejectResponseItemJSON"
        },
        "RejectResponseItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "RejectResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Rejected"
                },
                "code": {
                    "type": "string"
                },
                "message": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ErrorResponseItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "result": {
                    "type": "string",
                    "const": "Error"
                },
                "code": {
                    "type": "string"
                },
                "message": {
                    "type": "string"
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
                "content": {
                    "type": "object",
                    "properties": {
                        "expiresAt": {
                            "type": "string",
                            "description": "The point in time the request is considered obsolete either technically (e.g. the request is no longer valid or its response is no longer accepted) or from a business perspective (e.g. the request is no longer of interest).",
                            "default": "undefined - the request won't expire"
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
                        "title": {
                            "type": "string",
                            "description": "The human-readable title of this Request."
                        },
                        "description": {
                            "type": "string",
                            "description": "The human-readable description of this Request."
                        },
                        "metadata": {
                            "type": "object",
                            "description": "This property can be used to add some arbitrary metadata to this request. The content of this property will be copied into the response on the side of the recipient."
                        },
                        "@context": {
                            "type": "string"
                        }
                    },
                    "required": [
                        "items"
                    ],
                    "additionalProperties": false
                },
                "peer": {
                    "$ref": "#/definitions/AddressString"
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
                "@type": {
                    "type": "string",
                    "const": "RequestItemGroup"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this group."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this group."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this group. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the group content as they receive the response."
                },
                "items": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/RequestItemJSONDerivations"
                    },
                    "description": "The items of this group."
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
                    "$ref": "#/definitions/FormFieldRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/RegisterAttributeListenerRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/TransferFileOwnershipRequestItemJSON"
                }
            ]
        },
        "RequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                "@type": {
                    "type": "string",
                    "const": "CreateAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        }
                    ]
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
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttribute"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Relationship.Json"
                },
                "key": {
                    "type": "string"
                },
                "isTechnical": {
                    "type": "boolean"
                },
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "displayName": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "value": {}
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Consent"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "link": {
                    "type": "string"
                },
                "linkDisplayText": {
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
                "@type": {
                    "type": "string",
                    "const": "IdentityAttribute"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Identity.Json"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "day": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "year": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "honorificPrefix": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SexJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Sex"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Website"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
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
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
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
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
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
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthState"
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
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "City"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "CountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Country"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "State"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "StreetJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Street"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Surname"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "DeleteAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DeleteAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "attributeId": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ShareAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                "sourceAttributeId": {
                    "type": "string"
                },
                "thirdPartyAddress": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ProposeAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
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
                "@type": {
                    "type": "string",
                    "const": "IdentityAttributeQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttributeQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "attributeCreationHints": {
                    "$ref": "#/definitions/RelationshipAttributeCreationHintsJSON"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
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
                "title": {
                    "type": "string"
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Relationship.TypeName"
                },
                "description": {
                    "type": "string"
                },
                "valueHints": {
                    "$ref": "#/definitions/ValueHintsJSON"
                },
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
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
                "@type": {
                    "type": "string",
                    "const": "IQLQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "queryString": {
                    "type": "string"
                },
                "attributeCreationHints": {
                    "$ref": "#/definitions/IQLQueryCreationHintsJSON"
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
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "ReadAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/IQLQueryJSON"
                        }
                    ]
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
                "@type": {
                    "type": "string",
                    "const": "ThirdPartyRelationshipAttributeQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "owner": {
                    "type": "string",
                    "enum": [
                        "thirdParty",
                        "recipient",
                        ""
                    ]
                },
                "thirdParty": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
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
        "ConsentRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "ConsentRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "consent": {
                    "type": "string"
                },
                "link": {
                    "type": "string"
                },
                "linkDisplayText": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "AuthenticationRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                "@type": {
                    "type": "string",
                    "const": "FreeTextRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "freeText": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "freeText",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "FormFieldRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "FormFieldRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "settings": {
                    "$ref": "#/definitions/FormFieldSettingsJSONDerivations"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted",
                "settings",
                "title"
            ],
            "additionalProperties": false
        },
        "FormFieldSettingsJSONDerivations": {
            "anyOf": [
                {
                    "$ref": "#/definitions/StringFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/IntegerFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/DoubleFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/BooleanFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/DateFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/SelectionFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/RatingFormFieldSettingsJSON"
                }
            ]
        },
        "StringFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "StringFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "allowNewlines": {
                    "type": "boolean",
                    "const": true
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "IntegerFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "IntegerFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "DoubleFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DoubleFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "BooleanFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BooleanFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "DateFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DateFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "SelectionFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "SelectionFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "options": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "allowMultipleSelection": {
                    "type": "boolean",
                    "const": true
                }
            },
            "required": [
                "@type",
                "options"
            ],
            "additionalProperties": false
        },
        "RatingFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "RatingFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "maxRating": {
                    "type": "number",
                    "enum": [
                        5,
                        6,
                        7,
                        8,
                        9,
                        10
                    ]
                }
            },
            "required": [
                "@type",
                "maxRating"
            ],
            "additionalProperties": false
        },
        "RegisterAttributeListenerRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "RegisterAttributeListenerRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "query": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                        }
                    ]
                }
            },
            "required": [
                "@type",
                "mustBeAccepted",
                "query"
            ],
            "additionalProperties": false
        },
        "TransferFileOwnershipRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "TransferFileOwnershipRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "fileReference": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "fileReference",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "AddressString": {
            "type": "string",
            "pattern": "did:e:((([A-Za-z0-9]+(-[A-Za-z0-9]+)*)\\.)+[a-z]{2,}|localhost):dids:[0-9a-f]{22}"
        }
    }
}

export const DeleteIncomingRequestRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeleteIncomingRequestRequest",
    "definitions": {
        "DeleteIncomingRequestRequest": {
            "type": "object",
            "properties": {
                "requestId": {
                    "type": "string"
                }
            },
            "required": [
                "requestId"
            ],
            "additionalProperties": false
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
                "receivedRequest": {
                    "$ref": "#/definitions/RequestJSON"
                },
                "requestSourceId": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/MessageIdString"
                        },
                        {
                            "$ref": "#/definitions/RelationshipTemplateIdString"
                        }
                    ]
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
                "@type": {
                    "type": "string",
                    "const": "Request"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "id": {
                    "type": "string"
                },
                "expiresAt": {
                    "type": "string",
                    "description": "The point in time the request is considered obsolete either technically (e.g. the request is no longer valid or its response is no longer accepted) or from a business perspective (e.g. the request is no longer of interest).",
                    "default": "undefined - the request won't expire"
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
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this Request."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this Request."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this request. The content of this property will be copied into the response on the side of the recipient."
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
                "@type": {
                    "type": "string",
                    "const": "RequestItemGroup"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this group."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this group."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this group. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the group content as they receive the response."
                },
                "items": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/RequestItemJSONDerivations"
                    },
                    "description": "The items of this group."
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
                    "$ref": "#/definitions/FormFieldRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/RegisterAttributeListenerRequestItemJSON"
                },
                {
                    "$ref": "#/definitions/TransferFileOwnershipRequestItemJSON"
                }
            ]
        },
        "RequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                "@type": {
                    "type": "string",
                    "const": "CreateAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        }
                    ]
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
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttribute"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Relationship.Json"
                },
                "key": {
                    "type": "string"
                },
                "isTechnical": {
                    "type": "boolean"
                },
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "displayName": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "value": {}
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Consent"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "link": {
                    "type": "string"
                },
                "linkDisplayText": {
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
                "@type": {
                    "type": "string",
                    "const": "IdentityAttribute"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
                },
                "value": {
                    "$ref": "#/definitions/AttributeValues.Identity.Json"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "day": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "year": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "honorificPrefix": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SexJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Sex"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Website"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
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
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
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
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
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
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthState"
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
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "City"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "CountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Country"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "State"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "StreetJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Street"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Surname"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "DeleteAttributeRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DeleteAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "attributeId": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ShareAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                "sourceAttributeId": {
                    "type": "string"
                },
                "thirdPartyAddress": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ProposeAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                "attribute": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeJSON"
                        },
                        {
                            "$ref": "#/definitions/RelationshipAttributeJSON"
                        }
                    ]
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
                "@type": {
                    "type": "string",
                    "const": "IdentityAttributeQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttributeQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "attributeCreationHints": {
                    "$ref": "#/definitions/RelationshipAttributeCreationHintsJSON"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
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
                "title": {
                    "type": "string"
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Relationship.TypeName"
                },
                "description": {
                    "type": "string"
                },
                "valueHints": {
                    "$ref": "#/definitions/ValueHintsJSON"
                },
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
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
                "@type": {
                    "type": "string",
                    "const": "IQLQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "queryString": {
                    "type": "string"
                },
                "attributeCreationHints": {
                    "$ref": "#/definitions/IQLQueryCreationHintsJSON"
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
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "ReadAttributeRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/IQLQueryJSON"
                        }
                    ]
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
                "@type": {
                    "type": "string",
                    "const": "ThirdPartyRelationshipAttributeQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "owner": {
                    "type": "string",
                    "enum": [
                        "thirdParty",
                        "recipient",
                        ""
                    ]
                },
                "thirdParty": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
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
        "ConsentRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "ConsentRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "consent": {
                    "type": "string"
                },
                "link": {
                    "type": "string"
                },
                "linkDisplayText": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "AuthenticationRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
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
                "@type": {
                    "type": "string",
                    "const": "FreeTextRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "freeText": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "freeText",
                "mustBeAccepted"
            ],
            "additionalProperties": false
        },
        "FormFieldRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "FormFieldRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "settings": {
                    "$ref": "#/definitions/FormFieldSettingsJSONDerivations"
                }
            },
            "required": [
                "@type",
                "mustBeAccepted",
                "settings",
                "title"
            ],
            "additionalProperties": false
        },
        "FormFieldSettingsJSONDerivations": {
            "anyOf": [
                {
                    "$ref": "#/definitions/StringFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/IntegerFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/DoubleFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/BooleanFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/DateFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/SelectionFormFieldSettingsJSON"
                },
                {
                    "$ref": "#/definitions/RatingFormFieldSettingsJSON"
                }
            ]
        },
        "StringFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "StringFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "allowNewlines": {
                    "type": "boolean",
                    "const": true
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "IntegerFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "IntegerFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "DoubleFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DoubleFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "BooleanFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BooleanFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "DateFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DateFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            },
            "required": [
                "@type"
            ],
            "additionalProperties": false
        },
        "SelectionFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "SelectionFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "options": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "allowMultipleSelection": {
                    "type": "boolean",
                    "const": true
                }
            },
            "required": [
                "@type",
                "options"
            ],
            "additionalProperties": false
        },
        "RatingFormFieldSettingsJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "RatingFormFieldSettings"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "maxRating": {
                    "type": "number",
                    "enum": [
                        5,
                        6,
                        7,
                        8,
                        9,
                        10
                    ]
                }
            },
            "required": [
                "@type",
                "maxRating"
            ],
            "additionalProperties": false
        },
        "RegisterAttributeListenerRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "RegisterAttributeListenerRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "query": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/IdentityAttributeQueryJSON"
                        },
                        {
                            "$ref": "#/definitions/ThirdPartyRelationshipAttributeQueryJSON"
                        }
                    ]
                }
            },
            "required": [
                "@type",
                "mustBeAccepted",
                "query"
            ],
            "additionalProperties": false
        },
        "TransferFileOwnershipRequestItemJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "TransferFileOwnershipRequestItem"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string",
                    "description": "The human-readable title of this item."
                },
                "description": {
                    "type": "string",
                    "description": "The human-readable description of this item."
                },
                "metadata": {
                    "type": "object",
                    "description": "This property can be used to add some arbitrary metadata to this item. The content of this property will be copied into the response on the side of the recipient, so the sender can use it to identify the item as they receive the response."
                },
                "mustBeAccepted": {
                    "type": "boolean",
                    "description": "If set to `true`, the recipient has to accept this item if they want to accept the Request. If set to `false`, the recipient can decide whether they want to accept it or not."
                },
                "requireManualDecision": {
                    "type": "boolean",
                    "description": "If set to `true`, it advices the recipient of this RequestItem to carefully consider their decision and especially do not decide based on some automation rules."
                },
                "fileReference": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "fileReference",
                "mustBeAccepted"
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
                "requestId": {
                    "$ref": "#/definitions/RequestIdString"
                },
                "messageId": {
                    "$ref": "#/definitions/MessageIdString"
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
                "content": {
                    "type": "object",
                    "properties": {
                        "value": {
                            "$ref": "#/definitions/AttributeValues.Relationship.Json"
                        },
                        "key": {
                            "type": "string"
                        },
                        "confidentiality": {
                            "$ref": "#/definitions/RelationshipAttributeConfidentiality"
                        },
                        "isTechnical": {
                            "type": "boolean"
                        },
                        "validFrom": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "validTo": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        }
                    },
                    "required": [
                        "value",
                        "key",
                        "confidentiality"
                    ],
                    "additionalProperties": false
                },
                "peer": {
                    "$ref": "#/definitions/AddressString"
                },
                "requestMetadata": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string"
                        },
                        "description": {
                            "type": "string"
                        },
                        "metadata": {
                            "type": "object"
                        },
                        "expiresAt": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        }
                    },
                    "additionalProperties": false
                },
                "requestItemMetadata": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string"
                        },
                        "description": {
                            "type": "string"
                        },
                        "metadata": {
                            "type": "object"
                        },
                        "requireManualDecision": {
                            "type": "boolean"
                        }
                    },
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "displayName": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "value": {}
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Consent"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "link": {
                    "type": "string"
                },
                "linkDisplayText": {
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
            "additionalProperties": false,
            "properties": {
                "content": {
                    "type": "object",
                    "properties": {
                        "value": {},
                        "tags": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "validFrom": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "validTo": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
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
            ]
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
                "@type": {
                    "type": "string",
                    "const": "IdentityAttributeQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
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
                        "@type": {
                            "type": "string",
                            "const": "IQLQuery"
                        },
                        "queryString": {
                            "type": "string"
                        },
                        "attributeCreationHints": {
                            "$ref": "#/definitions/IQLQueryCreationHintsJSON"
                        },
                        "@context": {
                            "type": "string"
                        },
                        "@version": {
                            "type": "string"
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
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "RelationshipAttributeQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "owner": {
                    "type": "string"
                },
                "attributeCreationHints": {
                    "$ref": "#/definitions/RelationshipAttributeCreationHintsJSON"
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
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
                "title": {
                    "type": "string"
                },
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Relationship.TypeName"
                },
                "description": {
                    "type": "string"
                },
                "valueHints": {
                    "$ref": "#/definitions/ValueHintsJSON"
                },
                "confidentiality": {
                    "$ref": "#/definitions/RelationshipAttributeConfidentiality"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
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
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "displayName": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ThirdPartyRelationshipAttributeQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "key": {
                    "type": "string"
                },
                "owner": {
                    "type": "string",
                    "enum": [
                        "thirdParty",
                        "recipient",
                        ""
                    ]
                },
                "thirdParty": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                },
                "validFrom": {
                    "type": "string"
                },
                "validTo": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "key",
                "owner",
                "thirdParty"
            ],
            "additionalProperties": false
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
                "query": {
                    "$ref": "#/definitions/GetAttributesRequestQuery"
                },
                "onlyValid": {
                    "type": "boolean"
                },
                "hideTechnical": {
                    "type": "boolean"
                }
            },
            "additionalProperties": false
        },
        "GetAttributesRequestQuery": {
            "type": "object",
            "properties": {
                "createdAt": {
                    "type": "string"
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
                "isDefault": {
                    "type": "string"
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
                "content.isTechnical": {
                    "type": "string"
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
                "peer": {
                    "$ref": "#/definitions/AddressString"
                },
                "onlyValid": {
                    "type": "boolean"
                },
                "query": {
                    "$ref": "#/definitions/GetOwnSharedAttributeRequestQuery"
                },
                "hideTechnical": {
                    "type": "boolean"
                },
                "onlyLatestVersions": {
                    "type": "boolean",
                    "description": "default: true"
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
                "createdAt": {
                    "type": "string"
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
                "content.isTechnical": {
                    "type": "string"
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
                "peer": {
                    "$ref": "#/definitions/AddressString"
                },
                "onlyValid": {
                    "type": "boolean"
                },
                "query": {
                    "$ref": "#/definitions/GetPeerSharedAttributesRequestQuery"
                },
                "hideTechnical": {
                    "type": "boolean"
                },
                "onlyLatestVersions": {
                    "type": "boolean",
                    "description": "default: true"
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
                "createdAt": {
                    "type": "string"
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
                "content.isTechnical": {
                    "type": "string"
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
                "onlyLatestVersions": {
                    "type": "boolean",
                    "description": "default: true"
                },
                "query": {
                    "$ref": "#/definitions/GetRepositoryAttributesRequestQuery"
                }
            },
            "additionalProperties": false
        },
        "GetRepositoryAttributesRequestQuery": {
            "type": "object",
            "properties": {
                "createdAt": {
                    "type": "string"
                },
                "isDefault": {
                    "type": "string"
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
                "attributeId": {
                    "$ref": "#/definitions/AttributeIdString"
                },
                "peers": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/AddressString"
                    }
                },
                "onlyLatestVersions": {
                    "type": "boolean",
                    "description": "default: true"
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
                "attributeId": {
                    "$ref": "#/definitions/AttributeIdString"
                },
                "peer": {
                    "$ref": "#/definitions/AddressString"
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

export const SetAttributeDeletionInfoOfDeletionProposedRelationshipRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/SetAttributeDeletionInfoOfDeletionProposedRelationshipRequest",
    "definitions": {
        "SetAttributeDeletionInfoOfDeletionProposedRelationshipRequest": {
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

export const ShareRepositoryAttributeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ShareRepositoryAttributeRequest",
    "definitions": {
        "ShareRepositoryAttributeRequest": {
            "type": "object",
            "properties": {
                "attributeId": {
                    "$ref": "#/definitions/AttributeIdString"
                },
                "peer": {
                    "$ref": "#/definitions/AddressString"
                },
                "requestMetadata": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string"
                        },
                        "description": {
                            "type": "string"
                        },
                        "metadata": {
                            "type": "object"
                        },
                        "expiresAt": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        }
                    },
                    "additionalProperties": false
                },
                "requestItemMetadata": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string"
                        },
                        "description": {
                            "type": "string"
                        },
                        "metadata": {
                            "type": "object"
                        },
                        "requireManualDecision": {
                            "type": "boolean"
                        }
                    },
                    "additionalProperties": false
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
                "predecessorId": {
                    "$ref": "#/definitions/AttributeIdString"
                },
                "successorContent": {
                    "type": "object",
                    "properties": {
                        "value": {
                            "$ref": "#/definitions/AttributeValues.Relationship.Json"
                        },
                        "validFrom": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "validTo": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        }
                    },
                    "required": [
                        "value"
                    ],
                    "additionalProperties": false
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryBoolean"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "boolean"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                }
            }
        },
        "ValueHintsValueJSON": {
            "type": "object",
            "properties": {
                "key": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "displayName": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "ValueHints"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "editHelp": {
                    "type": "string"
                },
                "min": {
                    "type": "number"
                },
                "max": {
                    "type": "number"
                },
                "pattern": {
                    "type": "string"
                },
                "values": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/ValueHintsValueJSON"
                    }
                },
                "defaultValue": {
                    "type": [
                        "string",
                        "number",
                        "boolean"
                    ]
                },
                "propertyHints": {
                    "type": "object",
                    "additionalProperties": {
                        "$ref": "#/definitions/ValueHintsJSON"
                    }
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryCountry"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryEMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryFloat"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryHEXColor"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryInteger"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryPhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryString"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryURL"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryJSON"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "value": {}
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
                "@type": {
                    "type": "string",
                    "const": "ProprietaryXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "valueHintsOverride": {
                    "$ref": "#/definitions/ValueHintsOverrideJSON"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Consent"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "consent": {
                    "type": "string"
                },
                "link": {
                    "type": "string"
                },
                "linkDisplayText": {
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
                "predecessorId": {
                    "type": "string"
                },
                "successorContent": {
                    "type": "object",
                    "properties": {
                        "value": {
                            "$ref": "#/definitions/AttributeValues.Identity.Json"
                        },
                        "tags": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            }
                        },
                        "validFrom": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        },
                        "validTo": {
                            "$ref": "#/definitions/ISO8601DateTimeString"
                        }
                    },
                    "required": [
                        "value"
                    ],
                    "additionalProperties": false
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
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "day": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "year": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "BirthPlaceJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "CommunicationLanguageJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "DeliveryBoxAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "EMailAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "FaxNumberJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "IdentityFileReferenceJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "JobTitleJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "NationalityJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "PersonNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "honorificPrefix": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "PostOfficeBoxAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SexJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Sex"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "StreetAddressJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "Website"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "AffiliationRoleJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "AffiliationUnitJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "BirthCityJSON": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
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
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
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
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
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
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthState"
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
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
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
                "@type": {
                    "type": "string",
                    "const": "City"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "CountryJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Country"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "GivenNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HonorificPrefixJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HonorificSuffixJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "HouseNumberJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "MiddleNameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SchematizedXMLJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "schemaURL": {
                    "type": "string"
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
                "@type": {
                    "type": "string",
                    "const": "State"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "StreetJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Street"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "SurnameJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Surname"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        "ZipCodeJSON": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
                "@type": {
                    "type": "string",
                    "const": "IQLQuery"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "queryString": {
                    "type": "string"
                },
                "attributeCreationHints": {
                    "$ref": "#/definitions/IQLQueryCreationHintsJSON"
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
                "valueType": {
                    "$ref": "#/definitions/AttributeValues.Identity.TypeName"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
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
                "content": {},
                "type": {
                    "type": "string"
                }
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
                "id": {
                    "$ref": "#/definitions/LocalDraftIdString"
                },
                "content": {}
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
                "reference": {
                    "$ref": "#/definitions/AddressString"
                },
                "key": {
                    "type": "string"
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
                "reference": {
                    "$ref": "#/definitions/AddressString"
                },
                "key": {
                    "type": "string"
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
                "reference": {
                    "$ref": "#/definitions/AddressString"
                },
                "key": {
                    "type": "string"
                },
                "value": {}
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
                "key": {
                    "type": "string"
                },
                "value": {},
                "reference": {
                    "$ref": "#/definitions/GenericIdString"
                },
                "scope": {
                    "type": "string",
                    "enum": [
                        "Identity",
                        "Device",
                        "Relationship"
                    ]
                },
                "succeedsAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "succeedsItem": {
                    "$ref": "#/definitions/LocalSettingIdString"
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
                "key": {
                    "type": "string"
                },
                "reference": {
                    "type": "string"
                },
                "scope": {
                    "type": "string",
                    "enum": [
                        "Identity",
                        "Device",
                        "Relationship"
                    ]
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
                "id": {
                    "$ref": "#/definitions/LocalSettingIdString"
                },
                "value": {}
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
                "key": {
                    "type": "string"
                },
                "value": {},
                "reference": {
                    "$ref": "#/definitions/GenericIdString"
                },
                "scope": {
                    "type": "string",
                    "enum": [
                        "Identity",
                        "Device",
                        "Relationship"
                    ]
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

export const LoadItemFromReferenceRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/LoadItemFromReferenceRequest",
    "definitions": {
        "LoadItemFromReferenceRequest": {
            "type": "object",
            "properties": {
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
                },
                "password": {
                    "type": "string"
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
                "handle": {
                    "type": "string"
                },
                "platform": {
                    "type": "string"
                },
                "appId": {
                    "type": "string"
                },
                "environment": {
                    "type": "string",
                    "enum": [
                        "Development",
                        "Production"
                    ]
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

export const InitiateIdentityDeletionProcessRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/InitiateIdentityDeletionProcessRequest",
    "definitions": {
        "InitiateIdentityDeletionProcessRequest": {
            "type": "object",
            "properties": {
                "lengthOfGracePeriodInDays": {
                    "type": "number"
                }
            },
            "additionalProperties": false
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
                "id": {
                    "$ref": "#/definitions/MessageIdString"
                },
                "attachmentId": {
                    "$ref": "#/definitions/FileIdString"
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

export const GetAnnouncementsRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GetAnnouncementsRequest",
    "definitions": {
        "GetAnnouncementsRequest": {
            "type": "object",
            "properties": {
                "language": {
                    "$ref": "#/definitions/LanguageISO639"
                }
            },
            "required": [
                "language"
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

export const CreateRelationshipChallengeRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateRelationshipChallengeRequest",
    "definitions": {
        "CreateRelationshipChallengeRequest": {
            "type": "object",
            "properties": {
                "challengeType": {
                    "type": "string",
                    "const": "Relationship"
                },
                "relationship": {
                    "$ref": "#/definitions/RelationshipIdString"
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
                "challengeType": {
                    "type": "string",
                    "const": "Relationship"
                },
                "relationship": {
                    "$ref": "#/definitions/RelationshipIdString"
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
                "challengeString": {
                    "type": "string"
                },
                "signature": {
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
                "name": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "isAdmin": {
                    "type": "boolean"
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
                "id": {
                    "$ref": "#/definitions/DeviceIdString"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "profileName": {
                    "type": "string"
                },
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "password": {
                            "type": "string",
                            "minLength": 1
                        },
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "passwordLocationIndicator": {}
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
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
                "id": {
                    "$ref": "#/definitions/GenericIdString"
                },
                "profileName": {
                    "type": "string"
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
                "id": {
                    "$ref": "#/definitions/DeviceIdString"
                },
                "name": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
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

export const CreateTokenForFileRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateTokenForFileRequest",
    "definitions": {
        "CreateTokenForFileRequest": {
            "type": "object",
            "properties": {
                "fileId": {
                    "$ref": "#/definitions/FileIdString"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "ephemeral": {
                    "type": "boolean"
                },
                "forIdentity": {
                    "$ref": "#/definitions/AddressString"
                },
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "password": {
                            "type": "string",
                            "minLength": 1
                        },
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "passwordLocationIndicator": {}
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
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

export const DeleteFileRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeleteFileRequest",
    "definitions": {
        "DeleteFileRequest": {
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
                "query": {
                    "$ref": "#/definitions/GetFilesQuery"
                },
                "ownerRestriction": {
                    "$ref": "#/definitions/OwnerRestriction"
                }
            },
            "additionalProperties": false
        },
        "GetFilesQuery": {
            "type": "object",
            "properties": {
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
                "tags": {
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
                "reference": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/TokenReferenceString"
                        },
                        {
                            "$ref": "#/definitions/FileReferenceString"
                        }
                    ]
                },
                "password": {
                    "type": "string"
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
                "content": {
                    "type": "object",
                    "properties": {
                        "BYTES_PER_ELEMENT": {
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
                        "byteLength": {
                            "type": "number"
                        },
                        "byteOffset": {
                            "type": "number"
                        },
                        "length": {
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
                },
                "filename": {
                    "type": "string"
                },
                "mimetype": {
                    "type": "string"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "uniqueItems": true
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
                "filename": {
                    "type": "string"
                },
                "mimetype": {
                    "type": "string"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "title": {
                    "type": "string"
                },
                "description": {
                    "type": "string"
                },
                "tags": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    },
                    "uniqueItems": true
                },
                "content": {
                    "type": "object"
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
                "profileName": {
                    "type": "string"
                },
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "password": {
                            "type": "string",
                            "minLength": 1
                        },
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        }
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
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
                "id": {
                    "$ref": "#/definitions/MessageIdString"
                },
                "attachmentId": {
                    "$ref": "#/definitions/FileIdString"
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
                "recipients": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/AddressString"
                    },
                    "minItems": 1,
                    "uniqueItems": true
                },
                "content": {},
                "attachments": {
                    "type": "array",
                    "items": {
                        "$ref": "#/definitions/FileIdString"
                    },
                    "uniqueItems": true
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
                "templateId": {
                    "$ref": "#/definitions/RelationshipTemplateIdString"
                },
                "creationContent": {}
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
                "templateId": {
                    "$ref": "#/definitions/RelationshipTemplateIdString"
                },
                "creationContent": {}
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
                "id": {
                    "$ref": "#/definitions/RelationshipIdString"
                },
                "hideTechnical": {
                    "type": "boolean"
                },
                "onlyLatestVersions": {
                    "type": "boolean",
                    "description": "default: true"
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
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "content": {},
                "maxNumberOfAllocations": {
                    "type": "number",
                    "minimum": 1
                },
                "forIdentity": {
                    "$ref": "#/definitions/AddressString"
                },
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "password": {
                            "type": "string",
                            "minLength": 1
                        },
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "passwordLocationIndicator": {}
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
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

export const CreateTokenForOwnRelationshipTemplateRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CreateTokenForOwnRelationshipTemplateRequest",
    "definitions": {
        "CreateTokenForOwnRelationshipTemplateRequest": {
            "type": "object",
            "properties": {
                "templateId": {
                    "$ref": "#/definitions/RelationshipTemplateIdString"
                },
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "ephemeral": {
                    "type": "boolean"
                },
                "forIdentity": {
                    "$ref": "#/definitions/AddressString"
                },
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "password": {
                            "type": "string",
                            "minLength": 1
                        },
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "passwordLocationIndicator": {}
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
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

export const DeleteRelationshipTemplateRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeleteRelationshipTemplateRequest",
    "definitions": {
        "DeleteRelationshipTemplateRequest": {
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
                "query": {
                    "$ref": "#/definitions/GetRelationshipTemplatesQuery"
                },
                "ownerRestriction": {
                    "$ref": "#/definitions/OwnerRestriction"
                }
            },
            "additionalProperties": false
        },
        "GetRelationshipTemplatesQuery": {
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
                "passwordProtection": {
                    "type": "string",
                    "enum": [
                        "",
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
                "passwordProtection.passwordIsPin": {
                    "type": "string",
                    "enum": [
                        "true",
                        "!"
                    ]
                },
                "passwordProtection.passwordLocationIndicator": {
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
                "reference": {
                    "anyOf": [
                        {
                            "$ref": "#/definitions/TokenReferenceString"
                        },
                        {
                            "$ref": "#/definitions/RelationshipTemplateReferenceString"
                        }
                    ]
                },
                "password": {
                    "type": "string"
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
                "content": {},
                "expiresAt": {
                    "$ref": "#/definitions/ISO8601DateTimeString"
                },
                "ephemeral": {
                    "type": "boolean"
                },
                "forIdentity": {
                    "$ref": "#/definitions/AddressString"
                },
                "passwordProtection": {
                    "type": "object",
                    "properties": {
                        "password": {
                            "type": "string",
                            "minLength": 1
                        },
                        "passwordIsPin": {
                            "type": "boolean",
                            "const": true
                        },
                        "passwordLocationIndicator": {}
                    },
                    "required": [
                        "password"
                    ],
                    "additionalProperties": false
                }
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

export const DeleteTokenRequest: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeleteTokenRequest",
    "definitions": {
        "DeleteTokenRequest": {
            "type": "object",
            "properties": {
                "tokenId": {
                    "$ref": "#/definitions/TokenIdString"
                }
            },
            "required": [
                "tokenId"
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
                "query": {
                    "$ref": "#/definitions/GetTokensQuery"
                },
                "ownerRestriction": {
                    "$ref": "#/definitions/OwnerRestriction"
                }
            },
            "additionalProperties": false
        },
        "GetTokensQuery": {
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
                "passwordProtection": {
                    "type": "string",
                    "enum": [
                        "",
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
                "passwordProtection.passwordIsPin": {
                    "type": "string",
                    "enum": [
                        "true",
                        "!"
                    ]
                },
                "passwordProtection.passwordLocationIndicator": {
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
                "reference": {
                    "$ref": "#/definitions/TokenReferenceString"
                },
                "ephemeral": {
                    "type": "boolean"
                },
                "password": {
                    "type": "string"
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

export const City: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/City",
    "definitions": {
        "City": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "City"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const Country: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/Country",
    "definitions": {
        "Country": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Country"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const CommunicationLanguage: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/CommunicationLanguage",
    "definitions": {
        "CommunicationLanguage": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "CommunicationLanguage"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const EMailAddress: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/EMailAddress",
    "definitions": {
        "EMailAddress": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "EMailAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const FaxNumber: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/FaxNumber",
    "definitions": {
        "FaxNumber": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "FaxNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const PhoneNumber: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/PhoneNumber",
    "definitions": {
        "PhoneNumber": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PhoneNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const Website: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/Website",
    "definitions": {
        "Website": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Website"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const State: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/State",
    "definitions": {
        "State": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "State"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const ZipCode: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/ZipCode",
    "definitions": {
        "ZipCode": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "ZipCode"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const DeliveryBoxAddress: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DeliveryBoxAddress",
    "definitions": {
        "DeliveryBoxAddress": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DeliveryBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "userId": {
                    "type": "string"
                },
                "deliveryBoxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "phoneNumber": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
        }
    }
}

export const HouseNumber: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/HouseNumber",
    "definitions": {
        "HouseNumber": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HouseNumber"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const PostOfficeBoxAddress: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/PostOfficeBoxAddress",
    "definitions": {
        "PostOfficeBoxAddress": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PostOfficeBoxAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "boxId": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
        }
    }
}

export const Street: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/Street",
    "definitions": {
        "Street": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Street"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const StreetAddress: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/StreetAddress",
    "definitions": {
        "StreetAddress": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "StreetAddress"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "recipient": {
                    "type": "string"
                },
                "street": {
                    "type": "string"
                },
                "houseNo": {
                    "type": "string"
                },
                "zipCode": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
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
        }
    }
}

export const AffiliationOrganization: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/AffiliationOrganization",
    "definitions": {
        "AffiliationOrganization": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationOrganization"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const AffiliationRole: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/AffiliationRole",
    "definitions": {
        "AffiliationRole": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationRole"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const AffiliationUnit: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/AffiliationUnit",
    "definitions": {
        "AffiliationUnit": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "AffiliationUnit"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const Affiliation: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/Affiliation",
    "definitions": {
        "Affiliation": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Affiliation"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "organization": {
                    "type": "string"
                },
                "role": {
                    "type": "string"
                },
                "unit": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "organization"
            ],
            "additionalProperties": false
        }
    }
}

export const BirthCity: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/BirthCity",
    "definitions": {
        "BirthCity": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCity"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        }
    }
}

export const BirthCountry: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/BirthCountry",
    "definitions": {
        "BirthCountry": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthCountry"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        }
    }
}

export const BirthDay: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/BirthDay",
    "definitions": {
        "BirthDay": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthDay"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        }
    }
}

export const BirthMonth: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/BirthMonth",
    "definitions": {
        "BirthMonth": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthMonth"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
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
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        }
    }
}

export const BirthYear: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/BirthYear",
    "definitions": {
        "BirthYear": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthYear"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "number"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        }
    }
}

export const BirthDate: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/BirthDate",
    "definitions": {
        "BirthDate": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthDate"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "day": {
                    "type": "number"
                },
                "month": {
                    "type": "number"
                },
                "year": {
                    "type": "number"
                }
            },
            "required": [
                "@type",
                "day",
                "month",
                "year"
            ],
            "additionalProperties": false
        }
    }
}

export const BirthState: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/BirthState",
    "definitions": {
        "BirthState": {
            "type": "object",
            "properties": {
                "value": {
                    "type": "string"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "@type": {
                    "type": "string",
                    "const": "BirthState"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        }
    }
}

export const BirthPlace: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/BirthPlace",
    "definitions": {
        "BirthPlace": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthPlace"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "city": {
                    "type": "string"
                },
                "country": {
                    "type": "string"
                },
                "state": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "city",
                "country"
            ],
            "additionalProperties": false
        }
    }
}

export const DisplayName: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/DisplayName",
    "definitions": {
        "DisplayName": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "DisplayName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const IdentityFileReference: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/IdentityFileReference",
    "definitions": {
        "IdentityFileReference": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "IdentityFileReference"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const SchematizedXML: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/SchematizedXML",
    "definitions": {
        "SchematizedXML": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "SchematizedXML"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                },
                "schemaURL": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "value"
            ],
            "additionalProperties": false
        }
    }
}

export const BirthName: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/BirthName",
    "definitions": {
        "BirthName": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "BirthName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const GivenName: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/GivenName",
    "definitions": {
        "GivenName": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "GivenName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const HonorificPrefix: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/HonorificPrefix",
    "definitions": {
        "HonorificPrefix": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificPrefix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const HonorificSuffix: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/HonorificSuffix",
    "definitions": {
        "HonorificSuffix": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "HonorificSuffix"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const MiddleName: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/MiddleName",
    "definitions": {
        "MiddleName": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "MiddleName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const Surname: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/Surname",
    "definitions": {
        "Surname": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Surname"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const PersonName: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/PersonName",
    "definitions": {
        "PersonName": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "PersonName"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
                    "type": "string"
                },
                "givenName": {
                    "type": "string"
                },
                "middleName": {
                    "type": "string"
                },
                "surname": {
                    "type": "string"
                },
                "honorificSuffix": {
                    "type": "string"
                },
                "honorificPrefix": {
                    "type": "string"
                }
            },
            "required": [
                "@type",
                "givenName",
                "surname"
            ],
            "additionalProperties": false
        }
    }
}

export const Pseudonym: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/Pseudonym",
    "definitions": {
        "Pseudonym": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Pseudonym"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const Citizenship: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/Citizenship",
    "definitions": {
        "Citizenship": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Citizenship"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const JobTitle: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/JobTitle",
    "definitions": {
        "JobTitle": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "JobTitle"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const Nationality: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/Nationality",
    "definitions": {
        "Nationality": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Nationality"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}

export const Sex: any = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$ref": "#/definitions/Sex",
    "definitions": {
        "Sex": {
            "type": "object",
            "properties": {
                "@type": {
                    "type": "string",
                    "const": "Sex"
                },
                "@context": {
                    "type": "string"
                },
                "@version": {
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
        }
    }
}