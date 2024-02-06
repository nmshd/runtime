{{
  /**
   * Takes the path through a nested dict as an array of strings and returns
   * the value, or a fallback value, if the path does not exist.
   */
  function resolvePath(dict, path, fallback = null) {
    let val = dict
    for (const e of path) {
      if (!Object.keys(val).includes(e)) {
        return fallback
      }
      val = val[e]
    }
    return val
  }

  /**
   * Generic matching function for attributes.
   *
   * attributes:    Array of attributes
   * path:          Path to data field to apply matchFn to, represented as an
   *                array of strings. E.g. Foo.bar.baz is represented as ["Foo",
   *                "bar", "baz"].
   * matchFn:       Predicate function applied to the value of the extracted
   *                attribute data field represented by 'path'.
   * attributeType: See comment below.
   */
  function match(attributes, path, matchFn, attributeType = undefined) {
    const indices = []
    for (let ii = 0; ii < attributes.length; ii++) {
      const val = resolvePath(attributes[ii], path, null)

      // If attributeType is defined, assert that it matches the attribute's
      // type. When matching primary fields the mechanism presented by matchFn
      // below is insufficient as it's not given the full attribute but only
      // the selected data field.
      if (attributeType !== undefined && attributes[ii].value["@type"] !== attributeType) {
        continue
      }

      if (val !== null && matchFn(val)) {
        indices.push(ii)
      }
    }
    return indices
  }

  /**
   * Returns the union of two sets (represented as arrays of primitive
   * elements).
   */
  function union(arr1, arr2) {
    const result = Array.from(new Set([...arr1, ...arr2]))
    result.sort((a, b) => { return a - b })
    return result
  }

  /**
   * Returns the intersection of two sets (represented as arrays of primitive
   * elements).
   */
  function intersect(b, ...a) {
    const result = [b,...a].reduce((p,c) => p.filter(e => c.includes(e)));
    result.sort((a, b) => { return a - b })
    return result
  }

  /**
   * Returns the asymmetric difference of two sets (represented as arrays of
   * primitive elements).
   */
  function diffAsym(arr1, arr2) {
    const result = arr1.filter((x) => { return !arr2.includes(x) });
    result.sort((a, b) => { return a - b })
    return result
  }
}}

Expr
  = h:Expr0 t:(_+ '||' _+ @Expr0)*
    {
      return t.reduce((acc, element) => {
        return union(acc, element)
      }, h)
    }

Expr0
  = h:Expr1 t:(_+ '&&' _+ @Expr1)*
    {
      return t.reduce((acc, element) => {
        return intersect(acc, element)
      }, h)
    }

Expr1
  = '!' expr:Expr1
    {
      const allIndices = [...Array(options.attributes.length).keys()];
      return diffAsym(allIndices, expr)
    }
  / Expr2

// FIXME: Remove redundant whitespace between contiguous parentheses
//        Expr2 implies that bracketed expressions are always surrounded by
//        whitespaces, even in the case of contiguous parentheses. See
//        https://github.com/peggyjs/peggy/discussions/422.
Expr2
  = "(" _+ @Expr _+ ")"
  / Term

Term
  = PrimaryFieldTerm
  / MetadataFieldTerm
  / TagTerm

MetadataFieldTerm "metadata field term"
  = pathPrefix:PathSegment pathSuffix:( "." @PathSegment )* matchFn:Predicate
    {
      return match(
        options.attributes,
        [pathPrefix, ...pathSuffix],
        matchFn
      )
    }

/**
 * Tag terms are syntactic sugar for tags~... queries.
 */
TagTerm "tag term"
  = "#" tag:PredicateRHS
    {
      return match(
        options.attributes,
        ["tags"],
        (fieldVal) => { return Array.isArray(fieldVal) && fieldVal.includes(tag) }
      )
    }

/**
 * Primary field terms filter by the contents of an attribute's 'value' field.
 */
PrimaryFieldTerm "primary field term"
  = attributeType:AttributeType path:( "." @PathSegment )+ matchFn:Predicate
    {
      const result = match(
        options.attributes,
        ["value", ...path],
        matchFn,
        attributeType
      )
      return result
    }
  / attributeType:AttributeType matchFn:Predicate
    {
      return match(
        options.attributes,
        ["value", "value"],
        matchFn,
        attributeType
      )
    }
  / attributeType:AttributeType
    {
      // Providing only the attribute type returns attributes whose type
      // matches. E.g. 'PhoneNumber' will return all attributes whose type is
      // 'PhoneNumber', regardless of the values of any of their fields.
      return match(
        options.attributes,
        ["value", "@type"],
        (fieldVal) => { return fieldVal === attributeType }
      )
    }

/**
 * Predicate returns matchFn to be used with match().
 */
Predicate
  = op:[=><~] rhs:PredicateRHS
    {
      switch (op) {
        case "=":
          return (fieldVal) => { return String(fieldVal) === rhs }
        case ">":
          return (fieldVal) => { return new Date(fieldVal) >= new Date(rhs) }
        case "<":
          return (fieldVal) => { return new Date(fieldVal) <= new Date(rhs) }
        case "~":
          return (fieldVal) => { return Array.isArray(fieldVal) && fieldVal.includes(rhs) }
      }
    }
  / op:[?]
    {
      switch (op) {
        /* The ?-op checks whether a particular field is defined or not. Empty
         * arrays and dicts are treated as undefined. */
        case "?":
          return (fieldVal) => {
            if (Array.isArray(fieldVal)) {
              return fieldVal.length > 0
            }
            if (fieldVal.constructor.name === "Object") {
              return Object.keys(fieldVal).length > 0
            }
            return ( fieldVal !== undefined && fieldVal !== null )
          }
      }
    }

/**
 * Right-hand side value of predicates. Single quotes and backslashes have to
 * be backslash-escaped. If a value contains whitespaces the value has to be
 * put inside single quotes.
 */
PredicateRHS
  = "'" val:("\\\\" / "\\'" / [^'\\])* "'" // Quoted value
    {
      return val.join("").replaceAll("\\\\", "\\").replaceAll("\\'", "'")
    }
  / val:("\\\\" / "\\'" / [^'\\ ])* // Unquoted value w/o whitespaces
    {
      return val.join("").replaceAll("\\\\", "\\").replaceAll("\\'", "'")
    }

/**
 * Path segments refer to the pieces of a path through a nested dict.
 */
PathSegment
  = $([a-z][A-Za-z0-9]+)

/**
 * The attribute type refers to the `value[@type]` field of an attribute. It
 * must begin with a capital letter and must use alphanumeric ASCII only.
 */
AttributeType "attribute type"
  = $([A-Z][A-Za-z0-9]*)

_ "whitespace"
  = [ \t\n\r]
