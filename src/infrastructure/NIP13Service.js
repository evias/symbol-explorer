/*
 *
 * Copyright (c) 2019-present for NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License ");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import http from './http'
import helper from '../helper'
import { DataService, NamespaceService, RestrictionService, MetadataService, MultisigService } from '../infrastructure'
import { Constants } from '../config'
import { MosaicId } from 'symbol-sdk'
import AccountService from './AccountService'

class NIP13Service {
  /**
   * @description Known metadata keys
   */
  static KNOWN_METADATAS = {
    'D434152406E75CA0': 'nip13_token_identifier',
    '8B5DD479E6AB718A': 'nip13_name',
    'BC2FC3ACFF58FF89': 'nip13_isin',
    'D92F12883E1687AA': 'nip13_mic',
    '9E600698F53ED4F8': 'nip13_iso10962',
    '985A5AFB4D783C53': 'nip13_website'
  }

  /**
   * @description Known restriction keys
   */
  static KNOWN_RESTRICTIONS = {
    '15797563524206624788': 'nip13_user_role'
  }

  /**
   * Get known restriction keys from Hex format
   * @param hexKey - Hexadecimal format of the key (metadata key or restriction key)
   * @returns string
   */
  static getKnownRestrictionKey = (hexKey) => {
    return hexKey in this.KNOWN_RESTRICTIONS ? this.KNOWN_RESTRICTIONS[hexKey] : hexKey
  }

  /**
   * Get known metadata keys from Hex format
   * @param hexKey - Hexadecimal format of the key (metadata key or restriction key)
   * @returns string
   */
  static getKnownMetadataKey = (hexKey) => {
    return hexKey in this.KNOWN_METADATAS ? this.KNOWN_METADATAS[hexKey] : hexKey
  }

  /**
  * Gets the SecurityInfo for a given security
  * @param mosaicId -  Mosaic id
  * @returns Formatted MosaicInfo
  */
  static getSecurity = async mosaicId => {
    const mosaic = await http.createRepositoryFactory
      .createMosaicRepository()
      .getMosaic(mosaicId)
      .toPromise()

    return this.formatSecurityInfo(mosaic)
  }

  /**
   * Get formatted SecurityInfo dataset into Vue Component
   * @param securityName - Name of the security token
   * @returns MosaicInfo info object
   */
  static getSecurityInfo = async (securityName) => {
    const mosaicId = await helper.hexOrNamespaceToId(securityName, 'mosaic')
    const securityInfo = await this.getSecurity(mosaicId)

    return {
      ...securityInfo,
      securityName
    }
  }

  /**
   * Get custom SecurityInfo dataset into Vue Component for NIP13 Securities
   * @param limit — No of namespaceInfo
   * @param fromMosaicId — (Optional) retrive next mosaicInfo in pagination
   * @returns Custom MosaicInfo[]
   */
  static getSecuritiesList = async (limit, fromMosaicId) => {
    const mosaicInfos = await DataService.getMosaicsByIdWithLimit(limit, fromMosaicId)

    const mosaicIdsList = mosaicInfos.map(mosaicInfo => mosaicInfo.id)
    const mosaicNames = await NamespaceService.getMosaicsNames(mosaicIdsList)

    const formattedMosaics = mosaicInfos.map(mosaic => this.formatSecurityInfo(mosaic))

    return formattedMosaics.map(formattedMosaic => ({
      ...formattedMosaic,
      securityName: this.extractSecurityName(formattedMosaic, mosaicNames)
    })).filter(
      v => v.securityName && v.securityName.length &&
           v.securityName.startsWith('nip13')
    )
  }

  /**
   * Format MosaicInfo to readable mosaicInfo object
   * @param MosaicInfoDTO
   * @returns Object readable MosaicInfoDTO object
   */
  static formatSecurityInfo = mosaicInfo => ({
    mosaicId: mosaicInfo.id.toHex(),
    divisibility: mosaicInfo.divisibility,
    targetAccount: mosaicInfo.owner.address.plain(),
    balance: mosaicInfo.supply.compact().toLocaleString('en-US'),
    relativeAmount: helper.formatMosaicAmountWithDivisibility(mosaicInfo.supply, mosaicInfo.divisibility),
    revision: mosaicInfo.revision,
    startHeight: mosaicInfo.height.compact(),
    duration: mosaicInfo.duration.compact() > 0 ? mosaicInfo.duration.compact() : Constants.Message.UNLIMITED,
    supplyMutable: mosaicInfo.flags.supplyMutable,
    transferable: mosaicInfo.flags.transferable,
    restrictable: mosaicInfo.flags.restrictable
  })

  /**
   * Extract Name for Mosaic
   * @param mosaicInfo - mosaicInfo DTO
   * @param mosaicNames - MosaicNames[]
   * @returns mosaicName
   */
  static extractSecurityName = (mosaicInfo, mosaicNames) => {
    let mosaicName = mosaicNames.find((name) => name.mosaicId === mosaicInfo.mosaicId)
    const name = mosaicName.names.length > 0 ? mosaicName.names[0].name : Constants.Message.UNAVAILABLE
    return name
  }

  /**
   * Get Mosaic restrictions dataset into Vue component
   * @param securityName - Name of the security token
   * @returns Mosaic Global Restriction info
   */
  static getMosaicRestrictionsInfo = async (securityName) => {
    const mosaicId = await helper.hexOrNamespaceToId(securityName, 'mosaic')
    const mosaicRestrictions = await RestrictionService.getMosaicGlobalRestriction(mosaicId)

    // overwrite `restrictions` values to rewrite keys
    return {
      ...mosaicRestrictions,
      restrictions: mosaicRestrictions.restrictions.map(restriction => ({
        referenceMosaicId: restriction.referenceMosaicId,
        restrictionKey: this.getKnownRestrictionKey(restriction.restrictionKey),
        restrictionType: restriction.restrictionType,
        restrictionValue: restriction.restrictionValue
      }))
    }
  }

  /**
   * Get Mosaic restrictions dataset into Vue component
   * @param targetAccount - Address of the target account
   * @returns Mosaic Global Restriction info
   */
  static getAccountRestrictionsInfo = async (targetAccount) => {
    const accountRestrictions = await RestrictionService.getAccountRestrictions(targetAccount)
    return accountRestrictions
  }

  /**
   * Get securities metadata dataset into Vue component.
   * @param mosaicId - Mosaic id
   * @returns Mosaic Metadata list
   */
  static getSecurityMetadata = async (mosaicId) => {
    const mosaicMetadata = await MetadataService.getMosaicMetadata(new MosaicId(mosaicId), 10)

    // overwrite `scopeMetadataKey` values to rewrite keys
    const metadataFields = Object.keys(this.KNOWN_METADATAS)
    let out = {}
    mosaicMetadata.sort((a, b) => {
      const indexA = metadataFields.findIndex(v => v === a.scopedMetadataKey)
      const indexB = metadataFields.findIndex(v => v === b.scopedMetadataKey)
      return indexA - indexB
    }).reduce((prev, it) => {
      // reduce to only include listed known metadatas
      // first known metadata field
      if (prev && metadataFields.indexOf(prev.scopedMetadataKey) !== -1) {
        const key = this.getKnownMetadataKey(prev.scopedMetadataKey)
        out[key] = mosaicMetadata.find(m => m.scopedMetadataKey === prev.scopedMetadataKey).metadataValue
      }

      // rest of metadata fields
      if (metadataFields.indexOf(it.scopedMetadataKey) !== -1) {
        const key = this.getKnownMetadataKey(it.scopedMetadataKey)
        out[key] = mosaicMetadata.find(m => m.scopedMetadataKey === it.scopedMetadataKey).metadataValue
      }

      return out
    })

    return out
  }

  /**
   * Get operators dataset for Vue component
   * @param address - Account Address
   * @returns customize MultisigAccountInfo
   */
  static getSecurityOperators = async address => {
    const multisigAccountInfo = await MultisigService.getMultisigAccount(address)
    return {
      ...multisigAccountInfo,
      cosignatories: multisigAccountInfo?.cosignatories?.map(cosigner => cosigner.address),
      multisigAccounts: multisigAccountInfo?.multisigAccounts?.map(cosigner => cosigner.address)
    }
  }

  /**
   * Get partitions dataset for Vue component
   * @param address - Account Address
   * @returns customize MultisigAccountInfo
   */
  static getSecurityPartitions = async (payload) => {
    const cosig = await MultisigService.getMultisigAccount(payload.operatorAddress)
    if (!cosig || !cosig.multisigAccounts || !cosig.multisigAccounts.length) return []

    // filter out target account
    const accounts = cosig.multisigAccounts.map(m => m.address).filter(
      addr => addr !== payload.targetAccount
    )

    // read partitions information
    const partitions = await AccountService.getAccounts(accounts)

    // overwrite mosaics to hold security token name
    return partitions.map(partition => ({
      ...partition,
      mosaics: partition.mosaics.map(
        mosaic => ({
          id: payload.securityInfo.securityName,
          amount: mosaic.amount.compact().toString()
        }))
    }))
  }
}

export default NIP13Service
