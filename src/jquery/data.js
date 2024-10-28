import { migratePatchFunc, migrateWarn } from "../main.js";
import { camelCase } from "../utils.js";

var origData = jQuery.data,
	origPrivData = jQuery._data;

migratePatchFunc( jQuery, "data", function( elem, name, value ) {
	var curData, sameKeys, key;

	// Name can be an object, and each entry in the object is meant to be set as data
	if ( name && typeof name === "object" && arguments.length === 2 ) {

		curData = jQuery.hasData( elem ) && origData.call( this, elem );
		sameKeys = {};
		for ( key in name ) {
			if ( key !== camelCase( key ) ) {
				migrateWarn( "data-camelCase",
					"jQuery.data() always sets/gets camelCased names: " + key );
				curData[ key ] = name[ key ];
			} else {
				sameKeys[ key ] = name[ key ];
			}
		}

		origData.call( this, elem, sameKeys );

		return name;
	}

	// If the name is transformed, look for the un-transformed name in the data object
	if ( name && typeof name === "string" && name !== camelCase( name ) ) {

		curData = jQuery.hasData( elem ) && origData.call( this, elem );
		if ( curData && name in curData ) {
			migrateWarn( "data-camelCase",
				"jQuery.data() always sets/gets camelCased names: " + name );
			if ( arguments.length > 2 ) {
				curData[ name ] = value;
			}
			return curData[ name ];
		}
	}

	return origData.apply( this, arguments );
}, "data-camelCase" );

function patchDataProto( original ) {
	return function() {
		var result = original.apply( this, arguments );

		if ( arguments.length !== 1 ) {
			return result;
		}

		result.__proto__ = Object.prototype;

		if ( typeof Proxy !== "undefined" ) {
			result = new Proxy( result, {
				get: function( _target, property ) {
					if ( property in Object.prototype ) {
						migrateWarn( "data-null-proto",
							"Accessing properties inherited from Object.prototype is deprecated" );
					}
					return Reflect.get.apply( this, arguments );
				},
				set: function( _target, property ) {
					if ( property in Object.prototype ) {
						migrateWarn( "data-null-proto",
							"Setting properties inherited from Object.prototype is deprecated" );
					}
					return Reflect.set.apply( this, arguments );
				}
			} );
		}

		return result;
	};
}

// Yes, we are patching jQuery.data twice; here & above. This is necessary
// so that each of the two patches can be independently disabled.
migratePatchFunc( jQuery, "data", patchDataProto( origData ), "data-null-proto" );
migratePatchFunc( jQuery, "_data", patchDataProto( origPrivData ), "data-null-proto" );

// TODO jQuery.fn.data patches - both!
// TODO tests for all changes
