/* eslint-disable @typescript-eslint/naming-convention -- Standard OpenID4VC and serialized content field names. */
import { z } from "zod";

const imageSchema = z.union([z.string(), z.object({ uri: z.string().optional(), alt_text: z.string().optional() }).loose()]);
export const displayInformationSchema = z
    .array(
        z
            .object({
                name: z.string().optional(),
                locale: z.string().optional(),
                lang: z.string().optional(),
                description: z.string().optional(),
                logo: imageSchema.optional(),
                backgroundImage: imageSchema.optional(),
                background_image: imageSchema.optional(),
                background_color: z.string().optional(),
                text_color: z.string().optional()
            })
            .loose()
    )
    .optional();

export const credentialResponsesSchema = z.array(
    z.object({
        claimFormat: z.enum(["dc+sd-jwt", "mso_mdoc", "jwt_vc_json"]),
        encoded: z.string(),
        displayInformation: displayInformationSchema,
        displayInformationCachedImages: z
            .array(
                z.object({
                    "@type": z.literal("DisplayInformationCachedImages"),
                    "@context": z.string().optional(),
                    "@version": z.string().optional(),
                    locale: z.string().optional(),
                    logo: z.string().optional(),
                    backgroundImage: z.string().optional()
                })
            )
            .optional()
    })
);
